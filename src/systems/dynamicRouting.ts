import express, { Express, Request, Response } from "express";
import { glob } from "glob";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteContainer {
    [key: string]: {
        GET?: (req: Request, res: Response) => void | Promise<void>;
        POST?: (req: Request, res: Response) => void | Promise<void>;
        PUT?: (req: Request, res: Response) => void | Promise<void>;
        DELETE?: (req: Request, res: Response) => void | Promise<void>;
        PATCH?: (req: Request, res: Response) => void | Promise<void>;
    };
}

const routerMapping = async (dirPath: string) => {
    dirPath = dirPath
        .replace(/\\/g, "/"); // change backslash to froward slash

    // Find all route.js files in subdirectories
    const files = await glob(`${dirPath}/**/route.js`, { nodir: true, absolute: true });
    const routes: RouteContainer = {};

    for (const file of files) {
        try {
            const routePath = file
                .replace(/\\/g, "/") // Ensure compatibility in Windows
                .replace(dirPath, "")
                .replace(/\[(.*?)\]/g, ":$1") // Convert [param] → :param
                .replace(/\/route.js$/, "") || "/";
            // Load module
            const module = (await import(pathToFileURL(file).href)
                .then((module) => module.default ? { [module.default.name]: module.default, ...module } : module)) as { [key: string]: any };

            const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
            Object.keys(module)
                .filter((key): key is "GET" | "POST" | "PUT" | "DELETE" | "PATCH" =>
                    typeof module[key] === "function" && methods.includes(key)
                )
                .forEach((method) => {
                    if (!routes[routePath]) {
                        routes[routePath] = {};
                    }
                    routes[routePath][method] = module[method];
                    console.log(`Registered: ${method} ${routePath || "/"} ✅`);
                });
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return routes;
};

const router = express.Router();

// Await the route mapping asynchronously
const routeMap = await routerMapping(path.resolve(__dirname, "..", "routes"));

router.all('*', (request, response, next) => {
    const method = request.method.toUpperCase();
    const url = request.url;

    // Handle route mapping with dynamic parameters
    const matchedRoute = Object.keys(routeMap).find(routePath => {
        const regex = new RegExp(`^${routePath.replace(/:([a-zA-Z0-9_]+)/g, '([^/]+)')}$`);
        return regex.test(url);
    });

    const extractParam = () => {
        
    }

    if (matchedRoute) {
        const route = routeMap[matchedRoute];
        const handler = route[method as keyof typeof route];
        if (handler) {
            try {
                handler(request, response);
            } catch (error) {
                next(error);
            }
            return;
        }
    }

    next(); // If no match, pass to next middleware
});

export default router;

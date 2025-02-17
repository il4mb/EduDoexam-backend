import { globSync } from "fs";
import { glob } from "glob";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

export function generateRandomString({ length = 10, characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" }) {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export const numberToAlphabet = (value: number) => {
    const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const size = alphabets.length;
    let result = '';
    let number = Math.floor(value);

    while (number > 0) {
        number--;
        result = alphabets[number % size] + result;
        number = Math.floor(number / size);
    }

    return result;
};

export const generateId = (number = 1) => {
    const date = new Date();
    const year = date.getFullYear();
    const time = date.getTime()
    return `${numberToAlphabet((time / year) * number)}`.replace(/\s/g, '');
}








interface RouteMapping {
    [key: string]: any;
}

export const routerMapping = async (dirPath: string): Promise<RouteMapping> => {
    console.log(`Scanning routes in: ${dirPath}`);

    // Cari semua file route.js dalam subfolder
    const files = await glob(`${dirPath}/**/**/route.js`, { nodir: true, absolute: true });
    console.log(files, files.length);


    const routes: RouteMapping = {};

    for (const file of files) {
        const routePath = file
            .replace(dirPath, "") // Hilangkan base directory
            .replace(/\\/g, "/")  // Normalize Windows path
            .replace(/\/route.js$/, ""); // Hilangkan nama file route.js

        console.log(`Found route: ${routePath} -> ${file}`);

        try {
            // Load module
            const module = await import(pathToFileURL(file).href);

            if (module.default) {
                routes[routePath || "/"] = module.default;
                console.log(`Registered: ${routePath || "/"} ✅`);
            }
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return routes;
};

// Jalankan scanning
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await routerMapping(path.resolve(__dirname, "..", "routes")).then((routes) => {
    console.log("All Routes:", routes);
});




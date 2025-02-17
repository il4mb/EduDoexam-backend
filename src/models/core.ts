import { Request, Response } from "express";

export interface ExpressFC {
    request: Request;
    response: Response;
    next: () => void | Promise<void>;
}
import { Store } from "./lib/store";
import { Express, json } from "express";
import { EmptyPipeline, pipeline } from "./lib/pipeline";
import { ProcessPipeline, ProcessPipelineBatch } from "lib/processing";
import { RunAsserts } from "lib/assertions";
import { store } from "lib/internal";
import { HandleBatch } from "lib/batching";

const userStore = new Store();

const app = store.new<Express>("app", undefined);
const pipelines = store.new("pipelines", new Map<string, pipeline>());

export function GetStore() {
    return userStore;
}

export function HasApp() {
    return app.get() !== undefined;
}

export function GetApp() {
    return app.get();
}

export function CreateApp(override: boolean = false) {
    if (app.get() !== undefined) {
        if(!override) {   
            throw new Error("App already exists");
        }
        const previous = app.get();
        // @ts-ignore dunno why express types are this messed up
        previous.close();
    }
    app.set(require('express')());
    return EmptyPipeline(RegisterPipeline, StartApp);
}

export function GetExpress() {
    return app.get();
}

export const Helpers = {
    ShapeFrom: (shape: any) => {
        switch(typeof shape) {
            case "string": return "";
            case "bigint": return 0;
            case "number": return 0;
            case "boolean": return false;
            case "function": throw new Error("Cannot create shape from function");
            case "object": {
                if(shape === null) return null;
                if(Array.isArray(shape)) {
                    return shape.map(Helpers.ShapeFrom);
                }
                return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, Helpers.ShapeFrom(v)]));
            }
            case "undefined": return undefined;
            default: throw new Error("Unsupported type: " + typeof shape);
        }
    }
}

function StartApp(port: number = 3000, ignoreFailedAssertions: boolean = false) {
    if(RunAsserts() === false && !ignoreFailedAssertions) {
        throw new Error("Failed assertions");
    }
    const expressApp = app.get();
    if (expressApp === undefined) {
        throw new Error("App does not exist");
    }
    const allPipelines = pipelines.get();
    if(allPipelines.size === 0) {
        throw new Error("No pipelines registered");
    }
    expressApp.use(json());
    allPipelines.forEach((pipelineGroup, path) => {
        const isolated = path.split("/").reduce((acc, val) => { if(val.trim() === "") return acc; acc.push(val); return acc; }, []);
        if(isolated.length === 1 && isolated[0] === "batch") {
            return;
        }
        expressApp.post(path, (req, res) => {
            if(req.header("batched") && req.header("batched") === "true") {
                if(ProcessPipelineBatch(pipelineGroup, req, res))
                {
                    return;
                }
            } else {
                for (const p of pipelineGroup) {
                    if(ProcessPipeline(p, req, res)) {
                        return;
                    }
                }
            }
            res.status(404).send("Not found");
        });
    });
    expressApp.post("/batch/", (req, res) => {
        HandleBatch(allPipelines, req, res);
    });
    expressApp.listen(port, () => {
        console.log("Server started");
    });
}

function RegisterPipeline(__value: any) {
    pipelines.update((v) => {
        v = (v ?? new Map<string, pipeline>());
        const group = (v.get(__value.in) ?? []) as pipeline;
        group.push(__value.pipeline);
        group["batching"] = __value.batching;
        v.set(__value.in, group);
        return v;
    });
}

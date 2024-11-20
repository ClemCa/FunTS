import { Store } from "@lib/store";
import express, { Request, Response} from "express";
import { EmptyPipeline } from "@lib/pipeline";

const store = new Store();
const userStore = new Store();

const app = store.new<ReturnType<typeof express>>("app", undefined);
const pipelines = store.new("pipelines", new Map<string, any[]>());

export function CreateApp() {
    if (app.get() !== undefined) {
        throw new Error("App already exists");
    }
    app.set(express());
    return EmptyPipeline(RegisterPipeline, StartApp);
}

function StartApp() {
    const expressApp = app.get();
    if (expressApp === undefined) {
        throw new Error("App does not exist");
    }
    const allPipelines = pipelines.get();
    if(allPipelines.keys.length === 0) {
        throw new Error("No pipelines registered");
    }
    expressApp.use(express.json());
    allPipelines.forEach((pipelineGroup, path) => {
        expressApp.get(path, (req, res) => {
            pipelineGroup.forEach((p) => {
                if(ProcessPipeline(p, req, res)) {
                    return;
                }
            });
            res.status(404).send("Not found");
        });
    });
    expressApp.listen(3000, () => {
        console.log("Server started");
    });
}

function RegisterPipeline(__value: any) {
    pipelines.set((v) => {
        v = (v ?? new Map<string, any[]>());
        const group = v.get(__value.in) ?? [];
        group.push(__value.filter((k) => Array.isArray(k)));
        v.set(__value.in, group);
        return v;
    });
}

function ProcessPipeline(__value: [string, any][], req: Request, res: Response) {
    const body = req.body;
    const result = PipelineStep(__value, 0, body);
    if(result) {
        if(result === true) {
            res.status(200).send("OK");
            return true;
        }
        res.send(result);
        return true;
    }
    return false;
}

function PipelineStep(pipeline: [string, any][], step: number, body: object) {
    if(step === pipeline.length) {
        console.error("Unclosed pipeline");
        return false;
    }
    const [action, value] = pipeline[step];
    if(action === "where") {
        const result = value(body);
        if(result) {
            return PipelineStep(pipeline, step + 1, body);
        }
        return false;
    }
    switch(action) {
        case "do":
            value(body);
            return PipelineStep(pipeline, step + 1, body);
        case "static":
            return value;
        case "dynamic":
            return value(body);
        case "close":
            return true;
        case "pass":
            return PipelineStep(pipeline, step + 1, {...body, ...value});
        case "transform":
            return PipelineStep(pipeline, step + 1, value(body));
    };
    console.error("Unhandled action", action);
    return false;
}
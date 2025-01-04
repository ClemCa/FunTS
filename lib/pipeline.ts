import { App, Pipeline, ExpandableType, UnshapenPipeline, WithSideEffects, } from "./app";
import { Store } from "./store";
import { MakeDynamicAssertable, MakeStaticAssertable } from "./assertions";
import { Export, GetSchema, TypeFromShape } from "./export";

const store = new Store();
const pipelineCount = store.new("pipelineIDs", 0);

export function EmptyPipeline(outCallback: (value: any) => void, startCallback: (port?: number, ignoreFailedAssertions?: boolean) => void) {
    const obj = {
        __value: {
            out: outCallback,
            start: startCallback,
            batching: true,
        },
        in: (path: string) => ApplyIn(obj, path) as UnshapenPipeline<{}>,
        start: (port?: number, ignoreFailedAssertions?: boolean) => startCallback(port, ignoreFailedAssertions),
        export: Export,
        schema: () => {
            const obj = GetSchema();
            Object.defineProperty(obj, "___text", {
                enumerable: false,
                value: JSON.stringify(obj)
            });
            Object.defineProperty(obj, "toText", {
                enumerable: false,
                value: () => obj['___text']
            });
            return obj as object & {
                toText: () => string;
            };
        }
    }
    return obj as unknown as {
        in: (path: string) => UnshapenPipeline<{}>,
        start: (port?: number, ignoreFailedAssertions?: boolean) => void
        export: (path?: string) => void,
        schema: () => object & {
            toText: () => string;
        }
    };
}


function ApplyIn<T>(app: App<T>, inVal: string): UnshapenPipeline<T> {
    const obj = {
        ...app,
        __value: {
            ...app['__value'],
            export: undefined,
            in: inVal,
            pipeline: []
        },
        shape: (shape) => ApplyShape(obj, shape),
        where: (fn) => ApplyWhere(obj, fn),
        do: (action) => ApplyDo(obj, action),
        pass: (args) => ApplyPass(obj, args),
        transform: (fn) => ApplyTransform(obj, fn),
        batch: (allowBatching) => ApplyBatching(obj, allowBatching),
        static: (result) => ApplyOut(obj, "static", result),
        dynamic: (fn, shape) => ApplyOut(obj, "dynamic", fn, shape),
        close: () => ApplyOut(obj, "close", undefined),
        status: (code, message) => ApplyStatus(obj, code, message),
    };
    return obj;
}

function ApplyShape<T, U>(pipeline: UnshapenPipeline<T>, shape: U): Pipeline<U> {
    VerifyShape(shape);
    pipeline['__value'].pipeline.push(['shape', shape]);
    pipeline.shape = undefined;
    return pipeline as unknown as Pipeline<U>;
}

function ApplyWhere<T>(app: Pipeline<T>, where: (args: T) => boolean) {
    app['__value'].pipeline.push(['where', where]);
    return app;
}

function ApplyDo<T>(app: Pipeline<T>, action: (args: T) => void) {
    app['__value'].pipeline.push(['do', action]);
    return app;
}

function ApplyPass<T, U>(app: Pipeline<T>, args: U) {
    app['__value'].pipeline.push(['pass', args]);
    return app as Pipeline<ExpandableType<T, U>>;
}

function ApplyTransform<T, U>(app: Pipeline<T>, fn: (args: T) => U) {
    app['__value'].pipeline.push(['transform', fn]);
    return app as unknown as Pipeline<U>;
}

function ApplyBatching<T>(app: Pipeline<T>, allowBatching: boolean) {
    app['__value'].batching = allowBatching;
    return app;
}

function ApplyOut<T>(app: Pipeline<T>, mode, out: (value: T) => void | any, shape?: object | object[]) {
    app['__value'].pipeline.push([mode, out, mode === "static" ? TypeFromShape(out, undefined, undefined, true) : shape]);
    app['__value'].out(app['__value']);
    const id = pipelineCount.update((v) => v + 1) + "("+app['__value'].in+")";
    if(mode === "dynamic")
    {
        return MakeDynamicAssertable<WithSideEffects>(id, app['__value'].pipeline, false);
    }
    return MakeStaticAssertable<WithSideEffects>(id, app['__value'].pipeline, false);
}

function ApplyStatus<T>(app: Pipeline<T>, code: number, message: string) {
    app['__value'].pipeline.push(['status', [code, message]]);
    app['__value'].out(app['__value']);
    const id = pipelineCount.update((v) => v + 1) + "("+app['__value'].in+")";
    return MakeStaticAssertable<WithSideEffects>(id, app['__value'].pipeline, false);
}

function VerifyShape(shape: any) {
    for (const key in shape) {
        if (typeof shape[key] === "object") {
            VerifyShape(shape[key]);
        } else if (typeof shape[key] === "function") {
            throw new Error("Functions cannot be used over network");
        }
    }
}
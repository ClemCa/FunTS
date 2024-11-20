import { App, Pipeline, ExpandableType, UnshapenPipeline } from "./app";

export function EmptyPipeline(outCallback: (value: any) => void, startCallback: () => void) {
    const obj = {
        __value: {
            out: outCallback,
            start: startCallback,
        },
        in: (path: string) => ApplyIn(obj, path) as UnshapenPipeline<{}>,
        start: () => startCallback(),
    }
    return obj as unknown as {
        in: (path: string) => UnshapenPipeline<{}>,
        start: () => void
    };
}


function ApplyIn<T>(app: App<T>, inVal: string): UnshapenPipeline<T> {
    const obj = {
        ...app,
        __value: {
            ...app.__value,
            in: inVal,
            pipeline: []
        },
        shape: (shape) => ApplyShape(obj, shape),
        where: (fn) => ApplyWhere(obj, fn),
        do: (action) => ApplyDo(obj, action),
        pass: (args) => ApplyPass(obj, args),
        transform: (fn) => ApplyTransform(obj, fn),
        static: (result) => ApplyOut(obj, "static", result),
        dynamic: (fn) => ApplyOut(obj, "dynamic", fn),
        close: () => ApplyOut(obj, "close", undefined),
        status: (code, message) => ApplyStatus(obj, code, message),
    };
    return obj;
}

function ApplyShape<T, U>(pipeline: UnshapenPipeline<T>, shape: U): Pipeline<U> {
    pipeline.__value.pipeline.push(['shape', shape]);
    pipeline.shape = undefined;
    return pipeline as unknown as Pipeline<U>;
}

function ApplyWhere<T>(app: Pipeline<T>, where: (args: T) => boolean) {
    app.__value.pipeline.push(['where', where]);
    return app;
}

function ApplyDo<T>(app: Pipeline<T>, action: (args: T) => void) {
    app.__value.pipeline.push(['do', action]);
    return app;
}

function ApplyPass<T, U>(app: Pipeline<T>, args: U) {
    app.__value.pipeline.push(['pass', args]);
    return app as Pipeline<ExpandableType<T, U>>;
}

function ApplyTransform<T, U>(app: Pipeline<T>, fn: (args: T) => U) {
    app.__value.pipeline.push(['transform', fn]);
    return app as unknown as Pipeline<U>;
}

function ApplyOut<T>(app: Pipeline<T>, mode, out: (value: T) => void | any) {
    app.__value.pipeline.push([mode, out]);
    app.__value.out(app.__value);
}

function ApplyStatus<T>(app: Pipeline<T>, code: number, message: string) {
    app.__value.pipeline.push(['status', [code, message]]);
    app.__value.out(app.__value);
}
import { App, Pipeline, ExpandableType, UnshapenPipeline } from "@lib/app";

export function EmptyPipeline(outCallback: (value: any) => void, startCallback: () => void) {
    return {
        __value: {
            out: outCallback,
            start: startCallback,
        },
        in(path: string) {
            return ApplyIn<{}>(this, path) as UnshapenPipeline<{}>;
        }
    };
}


function ApplyIn<T>(app: App<T>, inVal: string): UnshapenPipeline<T> {
    return {
        ...app,
        __value: {
            out: app.__value.out,
            in: inVal,
        },
        shape: (shape) => ApplyShape(this, shape),
    };
}

function ApplyShape<T, U>(pipeline: UnshapenPipeline<T>, shape: U): Pipeline<U> {
    return {
        __value: {
            ...pipeline.__value,
            'shape': shape,
        },
        where: (fn) => ApplyWhere(this, fn),
        do: (action) => ApplyDo(this, action),
        pass: (args) => ApplyPass(this, args),
        transform: (fn) => ApplyTransform(this, fn),
        static: (result) => ApplyOut(this, "static", result),
        dynamic: (fn) => ApplyOut(this, "dynamic", fn),
        close: () => ApplyOut(this, "close", undefined),
    };
}

function ApplyWhere<T>(app: Pipeline<T>, where: (args: T) => boolean) {
    return {
        ...app,
        __value: {
            ...app.__value,
            pipeline: [
                ...app.__value?.pipeline,
                ['where', where]
            ]
        },
    };
}

function ApplyDo<T>(app: Pipeline<T>, action: (args: T) => void) {
    return {
        ...app,
        __value: {
            ...app.__value,
            pipeline: [
                ...app.__value?.pipeline,
                ['do', action]
            ]
        },
    };
}

function ApplyPass<T, U>(app: Pipeline<T>, args: U) {
    return {
        ...app,
        __value: {
            ...app.__value,
            pipeline: [
                ...app.__value?.pipeline,
                ['pass', args]
            ],
        },
    } as Pipeline<ExpandableType<T, U>>;
}

function ApplyTransform<T, U>(app: Pipeline<T>, fn: (args: T) => U) {
    return {
        ...app,
        __value: {
            ...app.__value,
            pipeline: [
                ...app.__value?.pipeline,
                ['transform', fn]
            ],
        },
    } as unknown as Pipeline<U>;
}

function ApplyOut<T>(app: Pipeline<T>, mode, out: (value: T) => void | any) {
    app.__value.out(
        {
            ...app.__value,
            [mode]: out
        }
    );
}
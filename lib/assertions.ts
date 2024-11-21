import { DynamicAssertable, NoSideEffects, StaticAssertable, WithSideEffects } from "./app";
import { PipelineStep } from "./processing";
import { Store } from "./store";
const testingStore = new Store()
const tests = testingStore.new("tests", [] as ['pipeline' | 'inspect', ...any][]);

export function RunAsserts() {
    let passed = true;
    const tsts = tests.get();
    for (let i = 0; i < tsts.length; i++) {
        const test = tsts[i];
        switch (test[0]) {
            case "pipeline":
                if (!TestPipeline(i+1, test[1], test[2], test[3], test[4], test[5])) {
                    passed = false;
                }
                break;
            case "inspect":
                if (!InspectAt(i+1, test[1], test[2], test[3], test[4], test[5], test[6])) {
                    passed = false;
                }
                break;
        }
    }
    return passed;
}


export function MakeStaticAssertable<T extends (NoSideEffects | WithSideEffects)>(id: string, __value: [string, any][], noSideEffects: T) {
    if(noSideEffects === false) {
        return {
            accepted: (entry: any) => RegisterStaticTest<false>(id, __value, entry, true, noSideEffects),
            inspect: (entry: any, step: number, body: any) => RegisterInspectTest<false>(id, __value, step, entry, body, noSideEffects),
            rejected: (entry: any, body?: any) => RegisterStaticTest<false>(id, __value, entry, false, noSideEffects, body),
            withoutDo: () => MakeStaticAssertable(id, __value, true),
        } as StaticAssertable<WithSideEffects>;
    }
    return {
        accepted: (entry: any) => RegisterStaticTest<true>(id, __value, entry, true, noSideEffects),
        inspect: (entry: any, step: number, body: any) => RegisterInspectTest<true>(id, __value, step, entry, body, noSideEffects),
        rejected: (entry: any, body?: any) => RegisterStaticTest<true>(id, __value, entry, false, noSideEffects, body),
        withDo: () => MakeStaticAssertable<WithSideEffects>(id, __value, false),
    } as StaticAssertable<NoSideEffects>;
}

export function MakeDynamicAssertable<T extends boolean>(id: string, __value: [string, any][], noSideEffects: T) {
    if(noSideEffects === false) {
        return {
            accepted: (entry: any, exit: any) => RegisterDynamicTest<false>(id, __value, entry, true, noSideEffects, exit),
            inspect: (entry: any, step: number, body: any) => RegisterInspectTest<false>(id, __value, step, entry, body, noSideEffects),
            rejected: (entry: any, body?: any) => RegisterDynamicTest<false>(id, __value, entry, false, noSideEffects, undefined, body),
            withoutDo: () => MakeDynamicAssertable(id, __value, true),
        } as DynamicAssertable<WithSideEffects>;
    }
    return {
        accepted: (entry: any, exit: any) => RegisterDynamicTest<true>(id, __value, entry, true, noSideEffects, exit),
        inspect: (entry: any, step: number, body: any) => RegisterInspectTest<true>(id, __value, step, entry, body, noSideEffects),
        rejected: (entry: any, body?: any) => RegisterDynamicTest<true>(id, __value, entry, false, noSideEffects, undefined,  body),
        withDo: () => MakeDynamicAssertable<WithSideEffects>(id, __value, false),
    } as DynamicAssertable<NoSideEffects>;
}

export function RegisterStaticTest<T extends boolean>(id: string, __value: [string, any][], entry: object, expectation: boolean, noSideEffects: T, body?: object) {
    tests.update((tests) => {
        tests.push(['pipeline', id, __value, entry, {
            expectation,
            body: body
        }, noSideEffects]);
        return tests;
    });
    return MakeStaticAssertable(id, __value, noSideEffects);
}

export function RegisterDynamicTest<T extends boolean>(id: string, __value: [string, any][], entry: object, expectation: boolean, noSideEffects: T, exit?: object, body?: object) {
    tests.update((tests) => {
        tests.push(['pipeline', id, __value, entry, {
            expectation,
            result: exit,
            body: body
        }, noSideEffects]);
        return tests;
    });
    return MakeDynamicAssertable(id, __value, noSideEffects);
}

export function RegisterInspectTest<T extends boolean>(id: string, __value: [string, any][], step: number, entry: object, body: object, noSideEffects: T) {
    tests.update((tests) => {
        tests.push(['inspect', id, __value, step, entry, body, noSideEffects]);
        return tests;
    });
    return MakeStaticAssertable(id, __value, noSideEffects);
}

export function TestPipeline(testNum: number, id: string, __value: [string, any][], entry: object, exit: {
    expectation: boolean;
    result?: object;
}, noSideEffects: boolean) {
    const result = PipelineStep(__value, 0, entry, undefined, true, noSideEffects);
    return VerifyResult(testNum, id, result, exit);
}

function InspectAt(testNum: number, id: string, __value: [string, any][], step: number, entry: object, body: object, noSideEffects: boolean) {
    const res = PipelineStep(__value, step, entry, step, undefined, noSideEffects);
    if (!Array.isArray(res) || res[0] !== "stopped") {
        console.log(res);
        console.error("[Assertion #" + testNum + "]", "Pipeline " + id + " stopped before inspection step " + step);
        return false;
    }
    if (!CompareBodies(res[1], body)) {
        console.error("[Assertion #" + testNum + "]", "Pipeline " + id + " failed to match expected body at step " + step, res[1], body);
        return false;
    }
    return true;
}

function VerifyResult(testNum: number, id: string, result: any, exit: { expectation: boolean; result?: object; body?: object; }) {
    if (result[0] === false) {
        if (exit.expectation) {
            console.error("[Assertion #" + testNum + "]","Pipeline " + id + " terminated with a rejection, expected a success");
            return false;
        }
        if (exit.result !== undefined) {
            console.warn("[Assertion #" + testNum + "]","exit.result should be undefined when expecting a pipeline rejection, this might be a library bug");
        }
        if (exit.body === undefined) {
            return true;
        }
        if (CompareBodies(exit.body, result[1])) {
            return true;
        }
        console.error("[Assertion #" + testNum + "]","Pipeline " + id + " failed to match expected body on exit, got", result[1], "expected", exit.result);
        return false;
    }
    if (!exit.expectation) {
        console.error("[Assertion #" + testNum + "]","Pipeline " + id + " returned a result ("+result[0]+"), expected a rejection");
        return false;
    }
    if (exit.result !== undefined) {
        if (!CompareAnyType(exit.result, result[0])) {
            console.error("[Assertion #" + testNum + "]","Pipeline " + id + " failed to match expected result, got", result[0], "expected", exit.result);
            return false;
        }
    }
    if (exit.body === undefined) {
        return true;
    }
    if (CompareBodies(exit.body, result[1])) {
        return true;
    }
    console.error("[Assertion #" + testNum + "]","Pipeline " + id + " failed to match expected body, got", result[1], "expected", exit.body);
    return false;
}

function CompareAnyType(a: any, b: any) {
    if (typeof a !== typeof b) {
        return false;
    }
    if (typeof a === "object") {
        return CompareBodies(a, b);
    }
    return a == b; // loose equality
}

function CompareBodies(a: object, b: object) {
    for (const key in a) {
        if (!(key in b)) {
            return false;
        }
        if (typeof a[key] !== typeof b[key]) {
            return false;
        }
    }
    return true;
}
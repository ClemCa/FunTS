import { CreateApp } from "./index";

const app = CreateApp();
app.in('/')
    .shape({
        a: 0,
        b: 0,
        c: 0
    })
    .where(({ b }) => {
        return b === 2
    })
    .transform(({ a, b, c }) => ({ a, b: b + 1, c }))
    .do(({ a, b, c }) => console.log("Hello " + a + b + c))
    .dynamic(() => "super", "")
    .withoutDo()
    // .accepted({ a: 1, b: 2, c: 3 })
    // .inspect({ a: 1, b: 2, c: 3 }, 2, { a: 1, b: 3, c: 3 })
    // .rejected({ a: 1, b: 1, c: 1 })

app.in('/').status(403, 'Forbidden')
    .accepted({ a: 1, b: 2, c: 3 })

app.in('/noshape/').status(200, 'OK')

// infers to an union of both objects
app.in('/test/').dynamic(({}) => ({ a: 1, b: 2 }), [{ a: 0, b: 0 }, { c: 0, b: 0 }]);
// infers to the object type
app.in('/test2/').dynamic(({}) => ({ a: 1, b: 2 }), { a: 0, b: 0 });

app.in('/test3/').static([1, 2, 3]);
app.in('/test4/').static([0]);

app.in('/test2/').dynamic(({}) => ({ a: [1, 2], b: {
    a: [1],
    b: 1
} }), { a: [0, 0], b: { a: [0], b: 0 } });

// infers to any
app.in('/test5/').dynamic(({}) => 1, []);
// infers to number[]
app.in('/test6/').dynamic(({}) => [0, 1, 2], [0]);


app.in('/test7/').dynamic(({}) => true, [false, 0]);

app.in('/test8/').dynamic(({}) => [true, 0], [[false, 0]]);
app.in('/test9/').dynamic(({}) => ({a: true}), {a: false} as const);

app.in("/test10/").static("hello");

app.in("/test11/").dynamic(({}) => ({ a: ["hello", "world"] }), { a: [""] });

app.in("/test12/").dynamic(({}) => ([200, ["hello", "world"]]), [""]);

app.export('schema.ts');
app.start();


fetch('http://localhost:3000/batch', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'batched': 'false'
    },
    body: JSON.stringify([["/", {
        a: 1,
        b: 1,
        c: 1
    }, false], ["/", {a: 1, b: 2, c: 3}, false]])
}).then(async res => {
    if(res.status === 200) {
        console.log(await res.json());
    }
    else {
        console.error("Failed to batch");
        console.log(await res.text());
    }
});
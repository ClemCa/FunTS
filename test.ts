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

app.export('schema.ts');
app.start();


// make a request to test
fetch('http://localhost:3000/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        a: 1,
        b: 1,
        c: 1
    })
}).then(async res => {
    console.assert(res.status === 403 && await res.text() === 'Forbidden');
});

fetch('http://localhost:3000/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        a: 1,
        b: 2,
        c: 3
    })
}).then(async res => {
    console.assert(res.status === 200 && await res.text() === "super");
});
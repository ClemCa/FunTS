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
    .dynamic(() => "super")
    .withoutDo()
    // .accepted({ a: 1, b: 2, c: 3 })
    // .inspect({ a: 1, b: 2, c: 3 }, 2, { a: 1, b: 3, c: 3 })
    // .rejected({ a: 1, b: 1, c: 1 })

app.in('/').status(403, 'Forbidden')
    .accepted({ a: 1, b: 2, c: 3 })

app.in('/noshape/').status(200, 'OK')

app.export('B:\\SideProjects\\FunTS-front\\test\\schema.ts');
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
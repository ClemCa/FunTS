import { CreateApp } from ".";

const app = CreateApp();
app.in('/')
    .shape({
        a: 0,
        b: 0,
        c: 0
    })
    .where(({ b }) => b === 2)
    .do(({ a, b, c }) => console.log("Hello " + a + b + c))
    .static("super");
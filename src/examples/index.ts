export interface CodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
}

export const examples: CodeExample[] = [
  {
    id: 'settimeout-basics',
    title: 'setTimeout Basics',
    description: 'Demonstrates how setTimeout pushes callbacks to the task queue',
    code: `console.log("Start");

setTimeout(function timer() {
  console.log("Timer callback");
}, 0);

console.log("End");`,
  },
  {
    id: 'promise-chain',
    title: 'Promise Chain',
    description: 'Shows how Promise .then() callbacks enter the microtask queue',
    code: `console.log("Start");

Promise.resolve("done")
  .then(function onResolve(val) {
    console.log("Promise resolved:", val);
    return "next";
  })
  .then(function onNext(val) {
    console.log("Chained:", val);
  });

console.log("End");`,
  },
  {
    id: 'event-loop-order',
    title: 'Event Loop Order',
    description: 'The classic interview question: microtasks run before macrotasks',
    code: `console.log(1);

setTimeout(function macro() {
  console.log(2);
}, 0);

Promise.resolve().then(function micro() {
  console.log(3);
});

console.log(4);
// Output: 1, 4, 3, 2`,
  },
  {
    id: 'mixed-async',
    title: 'Mixed Async',
    description: 'setTimeout and Promise interleaved — watch the event loop!',
    code: `console.log("sync 1");

setTimeout(function timer1() {
  console.log("macro 1");
}, 0);

Promise.resolve()
  .then(function micro1() {
    console.log("micro 1");
  })
  .then(function micro2() {
    console.log("micro 2");
  });

setTimeout(function timer2() {
  console.log("macro 2");
}, 0);

console.log("sync 2");`,
  },
  {
    id: 'new-promise',
    title: 'new Promise()',
    description: 'The executor runs synchronously, then .then() is async',
    code: `console.log("Start");

const p = new Promise(function executor(resolve) {
  console.log("Inside executor");
  resolve("hello");
  console.log("After resolve");
});

p.then(function onResolve(val) {
  console.log("Resolved:", val);
});

console.log("End");`,
  },
  {
    id: 'closure-demo',
    title: 'Closure Demo',
    description: 'Functions remember their lexical scope',
    code: `function createCounter() {
  let count = 0;
  return function increment() {
    count = count + 1;
    console.log("Count:", count);
    return count;
  };
}

const counter = createCounter();
counter();
counter();
counter();`,
  },
  {
    id: 'nested-settimeout',
    title: 'Nested setTimeout',
    description: 'Each setTimeout callback schedules the next one',
    code: `console.log("Start");

setTimeout(function first() {
  console.log("First");
  setTimeout(function second() {
    console.log("Second");
    setTimeout(function third() {
      console.log("Third");
    }, 0);
  }, 0);
}, 0);

console.log("End");`,
  },
  {
    id: 'call-stack-growth',
    title: 'Call Stack Growth',
    description: 'Watch functions stack up and unwind',
    code: `function multiply(a, b) {
  return a * b;
}

function square(n) {
  return multiply(n, n);
}

function printSquare(n) {
  const result = square(n);
  console.log("Square of", n, "is", result);
}

printSquare(5);`,
  },
];

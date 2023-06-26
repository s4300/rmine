const prompt = require("prompt-sync")({ sigint: true });

let running = true;

while (running) {
    let shellInput = prompt("");
    process.send({ input: `${shellInput}` });
}

// Send "exit" to interpreter
process.send({ input: "exit" });

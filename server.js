const WebSocket = require("ws")
const child_proc = require("child_process");
const uuid = require("uuid");
const process = require("process");
const fs = require('fs')

//
// Configuration files
//
// Please do not modify the following variables,
// but you may modify the values in "Configuration.js"
//
const Configuration = require("./Configuration");
let FloodAmount = Configuration.Flood_Amount;
let FloodInterval = Configuration.Flood_Interval;
let ServerPort = Configuration.Server_Port;

let Userfiles = path.join(__dirname, "userfiles");

const wss = new WebSocket.Server({ port: ServerPort })
console.log(`Running on port ${ServerPort} | /connect localhost:${ServerPort}`)

wss.on("close", () => {
    console.log("Client disconnected");
    process.exit();
})

// use /connect localhost:3000
wss.on("connection", socket => {
    console.log("Connected to client")

    function sendCommand(cmd) {
        const msg = {
            "header": {
                "version": 1,
                "requestId": uuid.v4(),
                "messagePurpose": "commandRequest",
                "messageType": "commandRequest"
            },
            "body": {
                "version": 1,
                "commandLine": cmd,
                "origin": {
                    "type": "player"
                }
            }
        }
        socket.send(JSON.stringify(msg))
    };
    function shellComment(comment) {
        console.log(`# ${comment}`);
    };

    socket.send(JSON.stringify({
        "header": {
            "version": 1,
            "requestId": uuid.v4(),
            "messageType": "commandRequest",
            "messagePurpose": "subscribe"
        },
        "body": {
            "eventName": "PlayerMessage"
        },
    }));

    socket.on("message", packet => {
        const msg = JSON.parse(packet);
        //console.log(msg);

        if (msg.header.messagePurpose == "commandResponse") {
            console.log(`- ${msg.body.message}`);
        };
    })

    // Check command
    function CheckCommand(command, prefix, commandCallback) {
        if (command.startsWith(prefix)) {
            command = command.replace(prefix, "");
            commandCallback(command);
        }
    }

    function RunCommand(message) {
        // -- COMMANDS -- Run command
        CheckCommand(message, "/", (command) => {
            sendCommand(command);
        })
        // -- COMMANDS -- Flood
        CheckCommand(message, "fl/", (command) => {
            shellComment(`Running the command "${command}" ${FloodAmount} times with an interval of ${FloodInterval} milliseconds.`);

            for (let repeatI = 0; repeatI < FloodAmount; repeatI++) {
                setTimeout(() => {
                    sendCommand(command);
                }, FloodInterval * repeatI);
            };
        })
        // -- COMMANDS -- Run file
        CheckCommand(message, "rf/", (command) => {
            try {
                const data = fs.readFileSync(path.join(Userfiles, command), "UTF-8")
                const lines = data.split(/\r?\n/)

                lines.forEach(line => {
                    sendCommand(line);
                })
            } catch (rfError) {
                shellComment(`rfError: ${rfError}`);
            }
        })
        // -- COMMANDS -- Temp Modify
        //
        // FloodAmount
        CheckCommand(message, "FloodAmount=", (command) => {
            FloodAmount = Number(command);
            shellComment(`Temporary set FloodAmount to ${FloodAmount}`);
        })
        // FloodInterval
        CheckCommand(message, "FloodInterval=", (command) => {
            FloodInterval = Number(command);
            shellComment(`Temporary set FloodInterval to ${FloodInterval}`);
        })
        //
        // -- COMMANDS -- Quit
        if (message == "quit" || message == "close" || message == "exit") {
            shell.disconnect();
            process.exit();
        }
    }

    const shell = child_proc.fork("./shell.js");
    shell.on("message", (shellMessage) => {
        let message = shellMessage.input;
        RunCommand(message);
    });

    shell.on("exit", () => {
        wss.close();
        process.exit();
    });

    sendCommand('tellraw @s {"rawtext":[{"text":"§aWelcome to Rmine!§§"}]}');
})

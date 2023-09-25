import { exec } from 'child_process';

// TODO can implement docker container for running env for python

// folling is for Dockerfile
// FROM python:3.9-slim
// WORKDIR /app
// Any other setup, like installing specific packages, can be done here.
// docker build -t python-sandbox .

function runPythonScript(scriptContent, callback) {
    // Save the Python code to a temporary file
    const tempFilePath = 'file.py'; // Choose an appropriate path
    require('fs').writeFileSync(tempFilePath, scriptContent);

    // Run the Docker container to execute the Python script
    exec(`docker run --rm -v ${tempFilePath}:/app/script.py python-sandbox python /app/script.py`, (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, stdout);
    });
}

const pythonCode = `
print("Hello from Python!")
`;

runPythonScript(pythonCode, (err, result) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Result:", result);
    }
});
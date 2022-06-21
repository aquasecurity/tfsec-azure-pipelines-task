import * as os from 'os';
import * as util from 'util';
import * as tool from 'azure-pipelines-tool-lib';
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import task = require('azure-pipelines-task-lib/task');

async function run() {
    try {
        console.log("Finding correct tfsec version...")
        let url = await getArtifactURL()
        let tmpPath = "/tmp/"
        let bin = "tfsec"
        let chmodRequired = true;
        if(os.platform() == "win32") {
            tmpPath = "%userprofile%\\AppData\\Local\\Temp\\"
            bin = "tfsec.exe"
            chmodRequired = false;
        }
        let localPath = tmpPath + bin;
        task.rmRF(localPath);

        console.log("Downloading tfsec...")
        let downloadPath = await tool.downloadTool(url, localPath);
        if(chmodRequired) {
            await task.exec('chmod', ["+x", downloadPath]);
        }

        console.log("Preparing output location...")
        let outputPath = tmpPath + "tfsec-results-" + Math.random();
        task.rmRF(outputPath);

        console.log("Configuring options...")
        let runner : ToolRunner = task.tool(downloadPath);
        let args = task.getInput("args", false)
        if(args !== undefined) {
            runner.line(args)
        }
        if(task.getBoolInput("debug", false)) {
            runner.arg("--debug")
        }
        runner.arg(["-f", "junit,json"]);
        runner.arg(["-O", outputPath]);
        let dir = task.getInput("dir", false)
        if(dir !== undefined) {
            runner.arg(dir)
        }else {
            runner.arg(task.cwd());
        }

        console.log("Running tfsec...")
        let result = runner.execSync();
        if(result.code === 0) {
            task.setResult(task.TaskResult.Succeeded, "No problems found.")
        }else{
            task.setResult(task.TaskResult.Failed, "Failed: tfsec detected misconfigurations.")
        }

        console.log("Publishing JUnit results...")
        const publisher: task.TestPublisher = new task.TestPublisher('JUnit');
        publisher.publish(outputPath + ".junit", 'true', '', '', "tfsec", 'true', "tfsec");

        console.log("Publishing JSON results...")
        task.addAttachment("JSON_RESULT", "results.json", outputPath+".json")

        console.log("Tidying up...")
        task.rmRF(outputPath);

        console.log("Done!");
    }
    catch (err: any) {
        task.setResult(task.TaskResult.Failed, err.message);
    }
}

async function getArtifactURL(): Promise<string> {
    let version: string | undefined = task.getInput('version', true);
    console.log("Required tfsec version is " + version)
    let platform: string = os.platform() == "win32" ? "windows" : os.platform();
    let arch: string = os.arch() == "x64" ? "amd64" : "386";
    let extension: string = os.platform() == "win32" ? ".exe" : "";
    let artifact: string = util.format("tfsec-%s-%s%s", platform, arch, extension);
    return util.format("https://github.com/aquasecurity/tfsec/releases/download/%s/%s", version as string, artifact);
}

run();
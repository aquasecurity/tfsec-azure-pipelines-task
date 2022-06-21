"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const util = __importStar(require("util"));
const tool = __importStar(require("azure-pipelines-tool-lib"));
const task = require("azure-pipelines-task-lib/task");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Finding correct tfsec version...");
            let url = yield getArtifactURL();
            let tmpPath = "/tmp/";
            let bin = "tfsec";
            let chmodRequired = true;
            if (os.platform() == "win32") {
                tmpPath = "%userprofile%\\AppData\\Local\\Temp\\";
                bin = "tfsec.exe";
                chmodRequired = false;
            }
            let localPath = tmpPath + bin;
            task.rmRF(localPath);
            console.log("Downloading tfsec...");
            let downloadPath = yield tool.downloadTool(url, localPath);
            if (chmodRequired) {
                yield task.exec('chmod', ["+x", downloadPath]);
            }
            console.log("Preparing output location...");
            let outputPath = tmpPath + "tfsec-results-" + Math.random();
            task.rmRF(outputPath);
            console.log("Configuring options...");
            let runner = task.tool(downloadPath);
            let args = task.getInput("args", false);
            if (args !== undefined) {
                runner.line(args);
            }
            if (task.getBoolInput("debug", false)) {
                runner.arg("--debug");
            }
            runner.arg(["-f", "junit,json"]);
            runner.arg(["-O", outputPath]);
            runner.arg(task.cwd());
            console.log("Running tfsec...");
            let result = runner.execSync();
            if (result.code === 0) {
                task.setResult(task.TaskResult.Succeeded, "No problems found.");
            }
            else {
                task.setResult(task.TaskResult.Failed, "Failed: tfsec detected misconfigurations.");
            }
            console.log("Publishing JUnit results...");
            const publisher = new task.TestPublisher('JUnit');
            publisher.publish(outputPath + ".junit", 'true', '', '', "tfsec", 'true', "tfsec");
            console.log("Publishing JSON results...");
            task.addAttachment("JSON_RESULT", "results.json", outputPath + ".json");
            console.log("Tidying up...");
            task.rmRF(outputPath);
            console.log("Done!");
        }
        catch (err) {
            task.setResult(task.TaskResult.Failed, err.message);
        }
    });
}
function getArtifactURL() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = task.getInput('version', true);
        console.log("Required tfsec version is " + version);
        let platform = os.platform() == "win32" ? "windows" : os.platform();
        let arch = os.arch() == "x64" ? "amd64" : "386";
        let extension = os.platform() == "win32" ? ".exe" : "";
        let artifact = util.format("tfsec-%s-%s%s", platform, arch, extension);
        return util.format("https://github.com/aquasecurity/tfsec/releases/download/%s/%s", version, artifact);
    });
}
run();

import execute from "../util/execute";
import fs from "fs";
import rimraf from "rimraf";

let localPath:any = null;

export class BuildStatus {
    constructor(public success:boolean, public data: string) {}
}

const deleteProject = (id:string) => {
    try { fs.rmSync(`tmp_projects/${id}/`, { recursive: true }); } catch (error) {}
}
const buildContract = async (id:string): Promise<BuildStatus> => {
    try {
        let project = fs.readFileSync(`tmp_projects/${id}/${id}.json`, 'utf8');
        project = JSON.parse(project);
        return buildContractFromProject(project, id);
    } catch (error) {
        console.error("Missing project files", error);
        return new BuildStatus(false, "Missing project files");
    }
}

const buildContractFromProject = async (project:any, id:string|null = null): Promise<BuildStatus> => {
    if(!id) id = Math.round(Math.random() * 10000000000000) + 100 + "-VSCODE";

    // Make new directory for project
    await rimraf(`tmp_projects/${id}/src`);
    try { fs.mkdirSync(`tmp_projects/${id}/`, { recursive: true }); } catch (error) {}
    try { fs.mkdirSync(`tmp_projects/${id}/src`, { recursive: true }); } catch (error) {}
    fs.writeFileSync(`tmp_projects/${id}/${id}.json`, JSON.stringify(project));

    // Write every file and create directories if the file is in a subdirectory
    project.files.forEach((file:any) => {
        if(file.path !== ""){
            let pathing = file.path.split("/");
            let newPath = "";
            for (let a = 0; a < pathing.length; a++){
                newPath += '/' + pathing[a];
                try { fs.mkdirSync(`tmp_projects/${id}/src${newPath}`, { recursive: true }); } catch (error) {}
            }
        }
        fs.writeFileSync(`tmp_projects/${id}/src/${file.path}${file.name}`, file.content);
    });

    return buildContractFromSource(project, id);
}


const buildContractFromSource = async (project:any, id:string): Promise<BuildStatus> => {

    const rootFile = project.files.filter((x:any) => x.name === project.root);

    if(!rootFile){
        return new BuildStatus(false, "Must set a .cpp file as Root.");
    }

    try { fs.mkdirSync(`tmp_projects/${id}/build`, { recursive: true }); } catch (error) {}
    try { await execute(`rm tmp_projects/${id}/build/*`); } catch (error) {}

    let timeTaken = Date.now();
    for(let file of rootFile){

        let buildString:string = `cdt-cpp -I tmp_projects/${id}/src/${project.name}/include -o tmp_projects/${id}/build/${project.contract}.wasm tmp_projects/${id}/src/${file.path}${file.name} --contract=${project.contract} --abigen --no-missing-ricardian-clause`;
        let buildResult:string = await execute(buildString).catch(x => x) as string;
        if(buildResult !== "") {
            if(!localPath) {
                localPath = (await execute('pwd')) + `/tmp_projects/${id}`;
                localPath = `\\/`+localPath. replace(/(\r\n|\n|\r)/gm, "").split('/').filter((x:any) => !!x).join('\\/');
            }

            const stripped = buildResult.replace(new RegExp(localPath, "g"), "").replace(new RegExp("/"+id+".cpp", "g"), file.name);
            return new BuildStatus(false, stripped);
        }

        // export memory from wasm
        // something is not working with piping in the wat on my env, so using a temp file
        /*const exportTmp = await execute(
            `wasm2wat tmp_projects/${id}/build/${rootFileName}.wasm | sed -e 's|(memory |(memory (export "memory") |' > tmp_projects/${id}/build/${rootFileName}.wat`
        ).then(x => true).catch(err => {
            console.error("Error exporting memory", err);
            return false;
        })
        if(exportTmp) {
            await execute(
                `wat2wasm -o tmp_projects/${id}/build/${rootFileName}.wasm tmp_projects/${id}/build/${rootFileName}.wat`
            ).catch(err => {
                console.error("Error exporting memory 2", err);
            })
            try { await execute(`rm tmp_projects/${id}/build/${rootFileName}.wat`); } catch (error) {}
        }
        */

    }

    timeTaken = Date.now() - timeTaken;
    console.log(`Time taken to build contract: ${timeTaken}ms`);

    const filesInBuildDir = fs.readdirSync(`tmp_projects/${id}/build`);
    if(filesInBuildDir.length === 0) return new BuildStatus(false, "No files in project's build directory");



    // remove any old zips
    try { await execute(`rm tmp_projects/${id}/*.zip`); } catch (error) {}
    try {
        const zipped = await execute(`cd tmp_projects/${id} && zip --junk-paths ${id}.zip -r ./build`);

    } catch (error) {
        console.error("error zipping files", error);
    }

    //await rimraf(`tmp_projects/${id}/src`);

    return new BuildStatus(true, id);
}

const downloadProject = async (id:string) => {
    try {
        let project:any = fs.readFileSync(`tmp_projects/${id}/${id}.json`, 'utf8');
        project = JSON.parse(project);

        // Make new directory for project
        try { fs.mkdirSync(`tmp_projects/${id}/src`, { recursive: true }); } catch (error) {}

        // Write every file and create directories if the file is in a subdirectory
        project.files.forEach((file:any) => {
            if(file.path !== "") try { fs.mkdirSync(`tmp_projects/${id}/src/${file.path}`, { recursive: true }); } catch (error) {}
            fs.writeFileSync(`tmp_projects/${id}/src/${file.path}${file.name}`, file.content);
        });

        // zip everything in the src folder into a new zip
        await execute(`cd tmp_projects/${id} && zip project.zip -r src`);
        await execute(`rm -rf tmp_projects/${id}/src`).catch(() => {});

        setTimeout(() => {
            execute(`rm tmp_projects/${id}/project.zip`).catch(() => {});
        }, 60000);

        return new BuildStatus(true, id);
    } catch (error) {
        console.error("Error downloading project", error);
        return new BuildStatus(false, "Error downloading project")
    }
}

export default {
    buildContract,
    buildContractFromProject,
    deleteProject,
    downloadProject
} as const;

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Configuration
const inputFolderArg = process.argv[2];
if (!inputFolderArg) {
    console.error('Erreur : Veuillez fournir le chemin vers le dossier contenant bruno-results.json.');
    console.error('Usage : node bruno-to-allure.js <chemin/vers/dossier>');
    process.exit(1);
}

const inputFolder = path.resolve(inputFolderArg);
const inputFile = path.join(inputFolder, 'bruno-results.json');
const outputDir = 'allure-results';

// Créer le dossier allure-results s'il n'existe pas, ou le vider
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Lire le fichier JSON généré par Bruno
if (!fs.existsSync(inputFile)) {
    console.error(`Erreur : Le fichier bruno-results.json est introuvable dans le dossier "${inputFolder}".`);
    process.exit(1);
}

const rawData = fs.readFileSync(inputFile, 'utf-8');
const brunoData = JSON.parse(rawData);

// Bruno encapsule les exécutions dans un tableau d'itérations
const results = brunoData[0].results;

// Temps initial arbitraire (Allure a besoin d'un timestamp)
let currentTime = Date.now();

// 2. Transformer chaque résultat en format Allure 2
results.forEach(test => {
    const testUuid = crypto.randomUUID();
    const durationMs = Math.round(test.runDuration * 1000);
    const allureStatus = test.status === 'pass' ? 'passed' : 'failed';

    // -- A. Création de deux pièces jointes séparées : Requête et Réponse
    const requestAttachmentUuid = crypto.randomUUID();
    const requestAttachmentContent = JSON.stringify({
        method: test.request.method,
        url: test.request.url,
        headers: test.request.headers,
        body: test.request.data || null
    }, null, 2);

    fs.writeFileSync(
        path.join(outputDir, `${requestAttachmentUuid}-attachment.json`),
        requestAttachmentContent
    );

    const responseAttachmentUuid = crypto.randomUUID();
    const responseAttachmentContent = JSON.stringify({
        status: test.response.status,
        responseTime: test.response.responseTime,
        headers: test.response.headers,
        body: test.response.data || null
    }, null, 2);

    fs.writeFileSync(
        path.join(outputDir, `${responseAttachmentUuid}-attachment.json`),
        responseAttachmentContent
    );

    // -- B. Transformation des assertions en "Steps" (Étapes Allure)
    const steps = [];

    // Helper pour construire un step avec statusDetails si erreur
    const buildStep = (name, item) => {
        const step = {
            name,
            status: item.status === 'pass' ? 'passed' : 'failed',
            stage: 'finished',
            start: currentTime,
            stop: currentTime
        };
        if (item.status !== 'pass' && item.error) {
            step.statusDetails = { message: item.error };
        }
        return step;
    };

    // Ajout des Pre-Request Tests
    if (test.preRequestTestResults && test.preRequestTestResults.length > 0) {
        test.preRequestTestResults.forEach(preTest => {
            steps.push(buildStep(`Pre-Request: ${preTest.description}`, preTest));
        });
    }

    // Ajout des Assertions
    if (test.assertionResults && test.assertionResults.length > 0) {
        test.assertionResults.forEach(assertion => {
            steps.push(buildStep(
                `Assertion: ${assertion.lhsExpr} ${assertion.operator} ${assertion.rhsOperand}`,
                assertion
            ));
        });
    }

    // Ajout des Tests (Scripts)
    if (test.testResults && test.testResults.length > 0) {
        test.testResults.forEach(scriptTest => {
            steps.push(buildStep(`Test: ${scriptTest.description}`, scriptTest));
        });
    }

    // Ajout des Post-Response Tests
    if (test.postResponseTestResults && test.postResponseTestResults.length > 0) {
        test.postResponseTestResults.forEach(postTest => {
            steps.push(buildStep(`Post-Response: ${postTest.description}`, postTest));
        });
    }

    // -- C. Dérivation de l'arborescence de dossiers depuis le champ "path"
    // Le dernier segment de path correspond au fichier (dont le nom d'affichage est "name")
    // Les segments précédents représentent les dossiers de la collection Bruno
    const pathParts = test.path.split('/');
    const folders = pathParts.slice(0, -1); // tout sauf le dernier segment (fichier)

    const hierarchyLabels = [{ name: "framework", value: "bruno" }];
    if (folders.length >= 1) hierarchyLabels.push({ name: "parentSuite", value: folders[0] });
    if (folders.length >= 2) hierarchyLabels.push({ name: "suite", value: folders[1] });
    if (folders.length >= 3) hierarchyLabels.push({ name: "subSuite", value: folders.slice(2).join('/') });

    // -- D. Construction de l'objet de test Allure
    const allureResult = {
        uuid: testUuid,
        name: test.name || "Requête sans nom",
        fullName: test.path,
        historyId: crypto.createHash('md5').update(test.path).digest('hex'),
        testCaseId: crypto.createHash('md5').update(test.path).digest('hex'),
        status: allureStatus,
        stage: 'finished',
        steps: steps,
        attachments: [
            {
                name: "Request Data",
                source: `${requestAttachmentUuid}-attachment.json`,
                type: "application/json"
            },
            {
                name: "Response Data",
                source: `${responseAttachmentUuid}-attachment.json`,
                type: "application/json"
            }
        ],
        parameters: [
            { name: "method", value: test.request.method },
            { name: "url", value: test.request.url }
        ],
        labels: hierarchyLabels,
        start: currentTime,
        stop: currentTime + durationMs
    };

    // Incrémenter le temps pour que la chronologie Allure soit logique
    currentTime = Math.round(currentTime + durationMs);

    // -- E. Écriture du fichier de résultat Allure (.json)
    fs.writeFileSync(
        path.join(outputDir, `${testUuid}-result.json`),
        JSON.stringify(allureResult, null, 2)
    );
});

console.log(`✅ Conversion terminée ! ${results.length} tests ont été convertis dans le dossier '${outputDir}'.`);
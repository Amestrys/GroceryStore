const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Configuration
const inputFile = 'bruno-results.json';
const outputDir = 'allure-results';

// Créer le dossier allure-results s'il n'existe pas, ou le vider
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Lire le fichier JSON généré par Bruno
if (!fs.existsSync(inputFile)) {
    console.error(`Erreur : Le fichier ${inputFile} est introuvable.`);
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
    const durationMs = test.runDuration * 1000;
    const allureStatus = test.status === 'pass' ? 'passed' : 'failed';

    // -- A. Création d'une pièce jointe (Attachment) pour la Requête / Réponse
    const attachmentUuid = crypto.randomUUID();
    const attachmentContent = JSON.stringify({
        request: {
            method: test.request.method,
            url: test.request.url,
            headers: test.request.headers,
            body: test.request.data || null
        },
        response: {
            status: test.response.status,
            responseTime: test.response.responseTime,
            headers: test.response.headers,
            body: test.response.data || null
        }
    }, null, 2);

    fs.writeFileSync(
        path.join(outputDir, `${attachmentUuid}-attachment.json`),
        attachmentContent
    );

    // -- B. Transformation des assertions en "Steps" (Étapes Allure)
    const steps = [];
    
    // Ajout des Assertions
    if (test.assertionResults && test.assertionResults.length > 0) {
        test.assertionResults.forEach(assertion => {
            steps.push({
                name: `Assertion: ${assertion.lhsExpr} ${assertion.operator} ${assertion.rhsOperand}`,
                status: assertion.status === 'pass' ? 'passed' : 'failed',
                stage: 'finished',
                start: currentTime,
                stop: currentTime
            });
        });
    }

    // Ajout des Tests (Scripts)
    if (test.testResults && test.testResults.length > 0) {
        test.testResults.forEach(scriptTest => {
            steps.push({
                name: `Test: ${scriptTest.description}`,
                status: scriptTest.status === 'pass' ? 'passed' : 'failed',
                stage: 'finished',
                start: currentTime,
                stop: currentTime
            });
        });
    }

    // -- C. Construction de l'objet de test Allure
    const allureResult = {
        uuid: testUuid,
        name: test.name || "Requête sans nom",
        historyId: crypto.createHash('md5').update(test.name + test.request.url).digest('hex'),
        status: allureStatus,
        stage: 'finished',
        steps: steps,
        attachments: [
            {
                name: "Request & Response Data",
                source: `${attachmentUuid}-attachment.json`,
                type: "application/json"
            }
        ],
        labels: [
            { name: "framework", value: "bruno" },
            { name: "suite", value: "API Tests" }
        ],
        start: currentTime,
        stop: currentTime + durationMs
    };

    // Incrémenter le temps pour que la chronologie Allure soit logique
    currentTime += durationMs;

    // -- D. Écriture du fichier de résultat Allure (.json)
    fs.writeFileSync(
        path.join(outputDir, `${testUuid}-result.json`),
        JSON.stringify(allureResult, null, 2)
    );
});

console.log(`✅ Conversion terminée ! ${results.length} tests ont été convertis dans le dossier '${outputDir}'.`);
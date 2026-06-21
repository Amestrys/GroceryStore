API :

https://github.com/vdespa/Postman-Complete-Guide-API-Testing/blob/main/simple-grocery-store-api.md

Commande pour lancer les tests + env + reporting

```
bru run --env GroceryEnv --reporter-html ./report/bruno-results.html
```


Commande CSV

```
bru run --csv-file-path ./data/dataset.csv --reporter-html ./report/bruno-results.html
```


Tranformation bruno-results.json vers allure-results
````
node bruno-to-allure.js <chemin_vers_dossier>
```` 


Générer le rapport Allure v3 (interface Awesome) :
````
npx allure awesome allure-results -o allure-report
```` 

Ouvrir le rapport Allure v3 :
````
npx allure open allure-report
```` 

Générer et ouvrir en une commande :
````
npx allure awesome allure-results -o allure-report ; npx allure open allure-report
```` 

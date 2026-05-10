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


Générer et ouvrir le rapport Allure :
````
npx allure serve allure-results
```` 

Générer et ouvrir le rapport Allure :
````
npx allure generate allure-results --clean -o allure-report
```` 

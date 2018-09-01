//express.js --> framework für entwicklung von webbasierten Anwendungen 
const express = require('express'); 
//body-parser --> Modul wird hier genutzt um http-Body zu parsen (body,head,etc)
const bodyParser = require('body-parser');
//Modul um http-Server laufen zu lassen 
const http = require('http');
// Modul um html's in PDF-Datei umzuwandeln 
var pdf = require('html-pdf')
// Modul um auf Filesystem zuzugreifen (wegschreiben, zugreifen, etc.)
var fs = require('fs');
//Modul um E-Mails zu vesenden
const sendmail = require('sendmail')();
//hier wird PDF-File abgelegt
const pdfPath = 'public/html/result/result.pdf'

//Server nutzt Express-Framework
const server = express();
//Server - http-Requests werden mit bodyParser genutzt
server.use(bodyParser.urlencoded({
    extended: true
}));
//API-KEY für last.fm 
const API_KEY = '0f46ade723efd6f37b48cc8c20b799a3';

//nutzt bodyParser um json zu parsen
server.use(bodyParser.json());
//Routen über die auf das Backend zugegriffen wird --> localhost:8000/Route (get-Request - Browser zeigt Ergebnis an)
server.get('/', (req, res) => {
    res.send('Server aktiv');
})
//Route für den Send-Mail-Agent 
server.post('/send-mail', (req, res) => {
    //result = parameter von dialogflow - text = Variable die vom Agent übergeben wird && Wenn tatsächlich text, dann befüll mit diktieren text, sonst text = "Ich habe dich nicht verstanden"
    const text = req.body.result && req.body.result.parameters && req.body.result.parameters.text ? req.body.result.parameters.text : 'Ich habe dich nicht verstanden';
    createIt (text, function() {
        return res.json({
            speech: 'Mail wurde versandt!',
            displayText: 'Mail wurde versandt',
            source: 'send-mail'
        });
    })
});
//Route zum Get-Artist-Agenten
server.post('/get-artist-details', (req, res) => {
    const artistToSearch = req.body.result && req.body.result.parameters && req.body.result.parameters.artists ? req.body.result.parameters.artists : 'eminem';
    const reqUrl = encodeURI(`http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artistToSearch}&api_key=${API_KEY}&format=json`);
    http.get(reqUrl, (responseFromAPI) => {
        let completeResponse = '';
        responseFromAPI.on('data', (chunk) => {
            completeResponse += chunk;
        });
        responseFromAPI.on('end', () => {
            const interpret = JSON.parse(completeResponse);
            let dataToSend = artistToSearch === 'Eminem' ? `I don't have the required info on that. Here's some info on 'eminem' instead.\n` : '';
            dataToSend += `the biography for ${interpret.artist.name} is: ${interpret.artist.bio.content}`;

            return res.json({
                speech: dataToSend,
                displayText: dataToSend,
                source: 'get-artist-details'
            });
        });
    }, (error) => {
        //http response wird an dialogflow zurückgeschickt.
        return res.json({
            speech: 'Something went wrong!',
            displayText: 'Something went wrong!',
            source: 'get-artist-details'
        });
    });
});
//funktion mit zwei Parametern --> Text (gesprochener Text) && Funktion callback
function createIt (text, callback) {
    //1. Step. erstelle mir mein html --> dann rufe mail function auf
    //2. wenn html erstellt --> für mail function aus
    //3. wenn mail function ausgeführt --> dann schicke http-response an dialogflow
    createHtml(text, function() {
        mail(function() {
            callback()
        });
    });
}

function htmlFormater (text) {
    return '<div>' + text + '</div>'
}

function createHtml(text, callback) {
    let html = htmlFormater(text)
    pdf.create(html).toFile(pdfPath, function(err, res) {
        if (err) return console.log(err);
        console.log(res); // { filename: '/app/businesscard.pdf' }
        callback()
    });       
}

function mail (callback) {
    fs.readFile(pdfPath, function (err, data) {
        sendmail({
            from: 'kuehni011@yahoo.de',
            to: 'kuehni011@yahoo.de',
            subject: 'Dein Google Assistant',
            html: 'Hallo, ich habe folgendes PDF für die erstellt:',
            attachments: [{'filename': 'result.pdf', 'content': data}]
        }, function(err, reply) {
            console.log(err && err.stack);
            console.dir(reply);
        });
    })
    callback()
}

server.listen((process.env.PORT || 8000), () => {
    console.log("Server is up and running...");
});
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
var pdf = require('html-pdf')
var fs = require('fs');

const sendmail = require('sendmail')();
const pdfPath = 'public/html/result/result.pdf'

const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

const API_KEY = '0f46ade723efd6f37b48cc8c20b799a3';

server.use(bodyParser.json());

server.get('/', (req, res) => {
    res.send('hello world');
})

server.post('/send-mail', (req, res) => {
    const text = req.body.result && req.body.result.parameters && req.body.result.parameters.text ? req.body.result.parameters.text : 'Ich habe dich nicht verstanden';
    createIt (text, function() {
        return res.json({
            speech: 'Mail wurde versandt!',
            displayText: 'Mail wurde versandt',
            source: 'send-mail'
        });
    })
});

server.post('/get-artist-details', (req, res) => {
    const artistToSearch = req.body.result && req.body.result.parameters && req.body.result.parameters.name ? req.body.result.parameters.name : 'eminem';
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
        return res.json({
            speech: 'Something went wrong!',
            displayText: 'Something went wrong!',
            source: 'get-artist-details'
        });
    });
});

function createIt (text, callback) {
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
            from: '20benny04@googlemail.com',
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
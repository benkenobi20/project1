const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

const API_KEY = '0f46ade723efd6f37b48cc8c20b799a3';

server.use(bodyParser.json());

server.get('/', (req, res) => {
    res.send('hello world');
})

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

server.listen((process.env.PORT || 8000), () => {
    console.log("Server is up and running...");
});
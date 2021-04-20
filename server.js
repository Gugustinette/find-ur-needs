// Create the app
const { debug } = require('console')
const express = require('express')
const app = express()

// Importing fs to read JSON file
var fs = require('fs')

// Create Server
const server = require('http').createServer(app)

// Importing Sockets.io
const options = { /* ... */ }
const io = require('socket.io')(server, options)

// Let the app uses static web environnement
app.use(express.static(__dirname))

app.get('/', (req, res) => {
    // Send the main website page
  res.sendFile(__dirname + '/index.html');
})

// Create variables
let geojson_foodpoints
let geojson_healthpoints
let geojson_infopoints
let geojson_specialpoints

let data_to_send_foodpoints
let data_to_send_healthpoints
let data_to_send_infopoints
let data_to_send_specialpoints

let data_to_send

/// Initiate all functions

// Function that compute the distance between two points, using longitude and latitude
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
}

// Function that take value in degree, then return its radian value
function deg2rad(deg) {
    return deg * (Math.PI/180)
}

// Function that read all JSON databases
function initGeoJSONData() {
    fs.readFile('data/geojson_foodpoint.json', function(err,content){
        geojson_foodpoints = JSON.parse(content)
    })
    fs.readFile('data/geojson_healthpoint.json', function(err,content){
        geojson_healthpoints = JSON.parse(content)
    })
    fs.readFile('data/geojson_infopoint.json', function(err,content){
        geojson_infopoints = JSON.parse(content)
    })
    fs.readFile('data/geojson_specialpoint.json', function(err,content){
        geojson_specialpoints = JSON.parse(content)
    })
}

// Function that initiate all JSON objects to send to user
function initPointsData() {
    data_to_send_foodpoints = {type: "FeatureCollection", features: []}
    data_to_send_healthpoints = {type: "FeatureCollection", features: []}
    data_to_send_infopoints = {type: "FeatureCollection", features: []}
    data_to_send_specialpoints = {type: "FeatureCollection", features: []}
}

// Function that takes a JSON database and return all its points located between a point (data) and the distance given
function searchPointsIn(geojson, distance, data) {
    let data_to_create = {type: "FeatureCollection", features: []}
    geojson.features.forEach(function(marker) {
        if (getDistanceFromLatLonInKm(data.longitude, data.latitude, marker.geometry.coordinates[0], marker.geometry.coordinates[1]) < distance) {
            data_to_create.features.push(marker)
        }
    })
    return data_to_create
}

initGeoJSONData()

// Server behaviour
io.on("connection", (socket) => {

    // USER : First connection
    socket.on("connection", (data) => {

        // Read JSON databases
        initGeoJSONData()

        // Initiate all JSON objects
        initPointsData()

        // Add the points to JSON objects for each type
        data_to_send_foodpoints = searchPointsIn(geojson_foodpoints, 10, data)
        data_to_send_healthpoints = searchPointsIn(geojson_healthpoints, 10, data)
        data_to_send_infopoints = searchPointsIn(geojson_infopoints, 10, data)
        data_to_send_specialpoints = searchPointsIn(geojson_specialpoints, 10, data)
        
        // Create the final JSON object to send
        data_to_send = {
            data_foodpoints: data_to_send_foodpoints,
            data_healthpoints: data_to_send_healthpoints,
            data_infopoints: data_to_send_infopoints,
            data_specialpoints: data_to_send_specialpoints
        }

        // Send the JSON to user
        socket.emit("sent_all_points", data_to_send)
    })

    // USER : Asking for points
    socket.on("ask_for_points", (data) => {

        // Read JSON databases
        initGeoJSONData()

        // Initiate all JSON objects
        initPointsData()

        // Add the points to JSON objects for each type
        if (data.is_input_foodpoint) {
            data_to_send_foodpoints = searchPointsIn(geojson_foodpoints, data.input_distance, data.coordinates)
        }
        if (data.is_input_healthpoint) {
            data_to_send_healthpoints = searchPointsIn(geojson_healthpoints, data.input_distance, data.coordinates)
        }
        if (data.is_input_infopoint) {
            data_to_send_infopoints = searchPointsIn(geojson_infopoints, data.input_distance, data.coordinates)
        }
        if (data.is_input_specialpoint) {
            data_to_send_specialpoints = searchPointsIn(geojson_specialpoints, data.input_distance, data.coordinates)
        }
        
        // Create the final JSON object to send
        data_to_send = {
            data_foodpoints: data_to_send_foodpoints,
            data_healthpoints: data_to_send_healthpoints,
            data_infopoints: data_to_send_infopoints,
            data_specialpoints: data_to_send_specialpoints
        }

        // Send the JSON to user
        socket.emit("sent_all_points", data_to_send)
    })

})


// Setting up the server to listen on port 8080
server.listen(8080)
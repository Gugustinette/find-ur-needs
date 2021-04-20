mapboxgl.accessToken = 'pk.eyJ1IjoiZ3VndXN0aW5ldHRlIiwiYSI6ImNrbmpjcjhmZDBnMHoyd21ncW5uYzBocHIifQ.IxR7BOlUj0aEb1ZWdbLP5A';

// Store URL (should be https://findurneeds.fr)
let URL_fun = "https://findurneeds.fr"

// Create WebSocket connection with URL
const socket = io(URL_fun, {
  reconnectionDelayMax: 10000,
  auth: {
    token: "123"
  }
});

// Create the map instance
let map

// Create the array used to store markers
let mapMarkers = []

// Get the <p> element displaying state
let p_state_display = document.getElementById("p_state_display")

// On connection
socket.on("connect", () => {
    p_state_display.innerHTML = "Attente d'autorisation de l'utilisation des coordonnées GPS"

    // Getting user position
    navigator.geolocation.getCurrentPosition(function(position) { // If success
        // Create map instance
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v10',
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 10
        })

        // Create "Home Marker" with user location
        createMarker("home", "", "", "", [position.coords.longitude, position.coords.latitude])
        
        // Store user location
        let data_to_send = {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude
        }

        // Send user location to server
        socket.emit("connection", data_to_send)
    }, function() { // If error
        p_state_display.innerHTML = "Impossible de récupérer les coordonnées GPS <br> Veuillez recharger la page"
    });
});

// On points received
socket.on("sent_all_points", (geojson) => {

    // Removing all markers
    mapMarkers.forEach((marker) => marker.remove())
    // Reset the array
    mapMarkers = []

    p_state_display.innerHTML = "Chargement des données..."

    // Create markers for each type of points
    geojson.data_foodpoints.features.forEach(function(marker) {
        createMarker("food_point", marker.properties.title, marker.properties.description, marker.properties.address, marker.geometry.coordinates)
    });
    geojson.data_healthpoints.features.forEach(function(marker) {
        createMarker("health_point", marker.properties.title, marker.properties.description, marker.properties.address, marker.geometry.coordinates)
    });
    geojson.data_infopoints.features.forEach(function(marker) {
        createMarker("info_point", marker.properties.title, marker.properties.description, marker.properties.address, marker.geometry.coordinates)
    });
    geojson.data_specialpoints.features.forEach(function(marker) {
        createMarker("special_point", marker.properties.title, marker.properties.description, marker.properties.address, marker.geometry.coordinates)
    });

    p_state_display.innerHTML = `${geojson.data_foodpoints.features.length + geojson.data_healthpoints.features.length + geojson.data_infopoints.features.length + geojson.data_specialpoints.features.length} points trouvés`
});

// Function that create a marker
function createMarker(type, title, description, address, coordinates) {
    // Create a HTML element for each feature
    var el = document.createElement('div');

    if (type == "food_point" || type == "health_point" || type == "info_point" || type == "special_point") {
        // Give the point its specific class
        if (type == "food_point") {
            el.className = 'marker_food';
        }
        else {
            if (type == "health_point") {
                el.className = 'marker_health';
            }
            else {
                if (type == "info_point") {
                    el.className = 'marker_info';
                }
                else {
                    if (type == "special_point") {
                        el.className = 'marker_special';
                    }
                }
            }
        }

        // Make a marker for each feature and add it to the map
        let new_marker = new mapboxgl.Marker(el)
        .setLngLat(coordinates) // Set coordinates
        .setPopup(new mapboxgl.Popup({ offset: 25 }) // Add pop-up
            .setHTML(
                '<div class="popup"><div class="popup_div_title"><h2 class="popup_div_title_text">' 
                + title
                + '</h2><hr class="popup_div_line"></div> <div class="popup_div_description"><h6 class="popup_div_description_text">' 
                + description
                + '<br><br></h6> <h6 class="popup_div_description_text">'
                + address
                + '</h6><a onclick="openOnMaps(' + coordinates[0] + ',' + coordinates[1] + ')" class="popup_button_map">S\'y rendre</a></div></div>'
            ))
        .addTo(map) // Add it to the map

        // Add the flyTo feature, which move the camera on a marker when clicking on it
        new_marker.getElement().addEventListener('click', (event) => {
            let targetMarker = event.target || event.srcElement // Get the element clicked
            mapMarkers.forEach(function(marker) { // Loop through all the markers with the array
                if (marker.getElement() == targetMarker) { // To do when marker was found in the array
                    map.flyTo({
                        zoom:12,
                        center: [
                            marker.getLngLat().lng,
                            marker.getLngLat().lat - 0.002 * map.getZoom(),
                        ],
                        speed: 1.0,
                        essential: true
                    })
                }
            })
        })

        // Add the marker to the array
        mapMarkers.push(new_marker)
    }
    else {
        if (type == "home") {
            // Give the points its specific class
            el.className = 'marker_home';

            // Make a marker from the user location and add it to the map
            new mapboxgl.Marker(el)
            .setLngLat(coordinates) // Set coordinates
            .setPopup(new mapboxgl.Popup({ offset: 25 }) // Add pop-up
                .setHTML(
                    '<div class="popup"><div class="popup_div_title"><h2 class="popup_div_title_text">' 
                    + "Chez vous"
                    + '</h2><hr class="popup_div_line"></div> <div class="popup_div_description"><h6 class="popup_div_description_text">' 
                    + "Il s'agit de votre position actuelle"
                    + '</h6> <h6 class="popup_div_description_text">'
                    + "" // Adresse
                    + '</h6></div></div>'
            ))
            .addTo(map) // Add it to the map
        }
    }
}

// Function that ask the points from server, using entered parameters
function ask_for_points() {

    // Getting user position
    navigator.geolocation.getCurrentPosition(function(position) { // If success
        
        // Get all the input elements
        let input_foodpoints = document.getElementById("input_foodpoint")
        let input_healthpoints = document.getElementById("input_healthpoint")
        let input_infopoints = document.getElementById("input_infopoint")
        let input_specialpoints = document.getElementById("input_specialpoint")

        let input_distance = document.getElementById("input_distance")

        // Store input data in JSON
        let data_to_send = {
            is_input_foodpoint: input_foodpoints.checked,
            is_input_healthpoint: input_healthpoints.checked,
            is_input_infopoint: input_infopoints.checked,
            is_input_specialpoint: input_specialpoints.checked,
            input_distance: input_distance.value,
            coordinates: {
                longitude: position.coords.longitude,
                latitude: position.coords.latitude
            }
        }

        map.flyTo({
            zoom: getZoomForDistance(data_to_send.input_distance),
            center: [
                position.coords.longitude,
                position.coords.latitude,
            ],
            speed: 1.0,
            essential: true
        })

        // Send data asked by user to the server
        socket.emit("ask_for_points", data_to_send)
    }, function() { // If error
        p_state_display.innerHTML = "Impossible de récupérer les coordonnées GPS <br> Veuillez recharger la page"
    });
}

// Call ask_for_points() but also move the user to the map
function ask_for_points_href() {
    ask_for_points()
    window.location.href='#'
}

// Function that open Google Maps (or equivalent) on a specific point (markers)
function openOnMaps(lng, lat) {
    if /* If we're on iOS, open in Apple Maps */
    ((navigator.platform.indexOf("iPhone") != -1) || 
     (navigator.platform.indexOf("iPad") != -1) || 
     (navigator.platform.indexOf("iPod") != -1) )
    window.open(`maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`);
    else /* Else use Google */
    window.open(`https://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`);
}

// Function that return a zoom value (for the map) using the max distance between user and markers
function getZoomForDistance(distance) {
    if (distance >= 1000) {
        return 4;
    }
    else {
        if (distance >= 500) {
            return 5;
        }
        else {
            if (distance >= 300) {
                return 7;
            }
            else {
                if (distance >= 200) {
                    return 8;
                }
                else {
                    if (distance >= 100) {
                        return 9;
                    }
                    else {
                        return 10;
                    }
                }
            }
        }
    }
}

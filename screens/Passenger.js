import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableHighlight,
  Keyboard,
  TouchableOpacity
} from 'react-native';

import io from 'socket.io-client'

import MapView, { Marker } from 'react-native-maps'
import Geolocation from '@react-native-community/geolocation';
import apiKey from '../services/key_google'
import Polyline  from '@mapbox/polyline'
import socketIO from 'socket.io-client'

// var _ = require('lodash');

export default class Passenger extends Component {
  constructor(props) {
    super(props);

    this.state = {
      latitude: 0,
      longitude: 0,
      error: "null",
      destination: "",
      predictions: [],
      pointsCoords: []
    };

  }

  componentDidMount() {
    // this.socket = io('http://192.168.0.34:3000');
    
    Geolocation.getCurrentPosition(
      position => {
        this.setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null
        })
      },
      error => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    )
  
  }

  submitChatMessage() {
    this.socket.emit("chat message", this.state.chatMessage);
    this.setState({ chatMessage: "" })
  }

  async onChangeDestination(destination) {

    this.setState({ destination })
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${apiKey}
    &input=${destination}&location=${this.state.latitude}, ${this.state.longitude}&radius=1000`

    try {
      const result = await fetch(apiUrl)
      const json = await result.json();

      this.setState({
        predictions: json.predictions
      })
    } catch (err) {
      console.log(err)
    }
    
  }

  async getRouteDirections(destinationPlaceId, descriptionName) {
    try {

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${this.state.latitude},${this.state.longitude}
        &destination=place_id:${destinationPlaceId}&key=${apiKey}`
      );

      const json = await response.json();
      
      const points = Polyline.decode(json.routes[0].overview_polyline.points);
      const pointsCoords = points.map(point => {
        return { latitude: point[0], longitude: point[1] }
      })

      this.setState({ 
        pointsCoords, 
        predictions: [],
        destination: descriptionName,
        routeResponse: json
      })

      Keyboard.dismiss();
      this.map.fitToCoordinates(pointsCoords);
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Chamando Um Motorista
   */
  async requestDriver() {
    const socket = socketIO.connect('http://192.168.0.34:3000')

    socket.on("connect", () => {
      // Chamando o carro
      socket.emit("taxiRequest", this.state.routeResponse)
    })
  }

  render() {

    let marker = null;
    let driverButton = null;

    if (this.state.pointsCoords.length > 1) {
      marker = (
        <Marker 
          coordinate={this.state.pointsCoords[this.state.pointsCoords.length -1]}
        />
      );

      driverButton = (
        <TouchableOpacity onPress={() => this.requestDriver()} style={styles.bottomButton} >
          <View>
            <Text style={styles.bottomText} >FIND DRIVE</Text>
          </View>
        </TouchableOpacity>
      )
    }

    const predictions = this.state.predictions.map(prediction => (
      <TouchableHighlight
        onPress={() => this.getRouteDirections(prediction.place_id, prediction.structured_formatting.main_text)}
        key={prediction.place_id}
      >
        <Text style={styles.suggestions} key={prediction.place_id} >{ prediction.description }</Text>
      </TouchableHighlight>
      
    ))

    return (
      <View style={styles.container} >

        <MapView 
          ref={map => {
            this.map = map
          }}
          style={styles.mapStyle}
          initialRegion={{
            latitude: -23.6632088,
            longitude: -46.718843,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421
          }}
          showsUserLocation={true}
        >
          <MapView.Polyline
            coordinates={this.state.pointsCoords}
            strokeWidth={2}
            strokeColor="blue"
          />
          {marker}
        </MapView>

        <TextInput
          placeholder="Enter destination..."
          value={this.state.destination}
          style={styles.destinationInput}
          onChangeText={destination => 
            this.onChangeDestination(destination)
          }
        />

        {predictions}
        {driverButton}

      </View>
    )
  }
}


const styles = StyleSheet.create({
  bottomButton: {
    backgroundColor: 'black',
    marginTop: "auto",
    margin: 20,
    paddingLeft:30,
    paddingRight: 30,
    alignSelf: "center"
  },
  bottomText: {
    color: "white",
    fontSize: 20
  },
  suggestions: {
    backgroundColor: "white",
    padding: 5,
    fontSize: 12,
    borderWidth: 0.5,
    marginLeft: 5,
    marginRight: 5
  },
  destinationInput: {
    height: 40,
    borderWidth: 0.5,
    marginTop: 10,
    marginLeft: 5,
    marginRight: 5,
    padding: 5,
    backgroundColor: "white"
  },
  mapStyle: {
    ...StyleSheet.absoluteFillObject
  },
  container: {
    ...StyleSheet.absoluteFillObject
  },
  welcome: {
    fontSize: 20,
    textAlign: "center"
  }
});


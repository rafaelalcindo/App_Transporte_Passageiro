import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator
} from 'react-native';

import socketIO from 'socket.io-client'

import MapView, { Marker } from 'react-native-maps'
import Geolocation from '@react-native-community/geolocation';
import apiKey from '../services/key_google'
import Polyline  from '@mapbox/polyline'

// var _ = require('lodash');

export default class Driver extends Component {
  constructor(props) {
    super(props);

    this.state = {
      latitude: 0,
      longitude: 0,
      error: "null",
      pointsCoords: [],
      lookingForPassengers: false,
      buttonText: "FIND PASSENGER"
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


  async getRouteDirections(destinationPlaceId) {
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
        pointsCoords
      })

      Keyboard.dismiss();
      this.map.fitToCoordinates(pointsCoords);
    } catch (err) {
      console.error(err)
    }
  }

  async lookForPassengers() {
      this.setState({
          lookingForPassengers: true
      })

      const socket = socketIO.connect('http://192.168.0.34:3000')

      socket.on('connect', () => {
          socket.emit("lookingForPassenger")
      })

      socket.on("taxiRequest", routeResponse => {
          console.log(routeResponse)
          this.getRouteDirections(routeResponse.geocoded_waypoints[0].place_id)

          this.setState({
              lookForPassengers: false,
              buttonText: "PASSENGER FOUND!"
          })
      })
  }

  render() {

    let marker = null;

    if (this.state.pointsCoords.length > 1) {
      marker = (
        <Marker 
          coordinate={this.state.pointsCoords[this.state.pointsCoords.length -1]}
        />
      );
    }

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
        
        <TouchableOpacity
            onPress={() => this.lookForPassengers()}
            style={styles.bottomButton}
        >
            <View  >
            <Text style={styles.bottomText} >{ this.state.buttonText }</Text>
                {this.state.lookingForPassengers === true ? (
                    <ActivityIndicator 
                        animating={this.state.lookingForPassengers}
                        size="large"
                        style={styles.bottomText}
                    />
                ) : null}
                
            </View>

        </TouchableOpacity>

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


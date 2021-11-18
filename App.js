// Reference: 

// https://stackoverflow.com/questions/12875486/what-is-the-algorithm-to-create-colors-for-a-heatmap
// https://create.arduino.cc/projecthub/Juliette/a-diy-smart-insole-to-check-your-pressure-distribution-a5ceae 
// https://learn.adafruit.com/force-sensitive-resistor-fsr/using-an-fsr
// https://learn.sparkfun.com/tutorials/force-sensitive-resistor-hookup-guide 
// https://www.sparkfun.com/products/9375
// https://stackoverflow.com/questions/48602395/how-can-i-automatically-scale-an-svg-element-within-a-react-native-view

import React, { Component, useRef, useState } from 'react';
import { TouchableOpacity, Switch, Alert, Platform, View, Text, Button, StyleSheet } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import Base64 from 'base-64';
import Svg, { Path, G, Circle } from "react-native-svg";
import { Slider, Icon } from 'react-native-elements';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';


export default class App extends Component {
  constructor() {
    super()
    this.manager = new BleManager() // Create BLE manager object
    this.service = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
    this.characteristicW = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
    this.characteristicN = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
    this.state = {
      info: "",
      toe: 0,
      left: 0,
      right: 0,
      heel: 0,
      app_state: "NewState"
    }
    this.device = null;
  }

  updateValue(key, v) {
    const position = Base64.decode(v);
    const posArray = position.split(",");
    const toe = Number(posArray[0]) ? Number(posArray[0]) / 1023 : 0;
    const left = Number(posArray[1]) ? Number(posArray[1]) / 1023 : 0;
    const right = Number(posArray[2]) ? Number(posArray[2]) / 1023 : 0;
    const heel = Number(posArray[3]) ? Number(posArray[3]) / 1023 : 0;

    this.setState({ toe, left, right, heel });
    //console.log("roll:", roll, "pitch:", pitch, "yaw:", yaw);

  }

  componentDidMount() {
    const subscription = this.manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        this.setState({ app_state: "start" }); // Search for devices
        subscription.remove();
      }
    }, true);
  }

  scan = () => {
    this.manager.startDeviceScan(null, null, (error, device) => {
      this.setState({ info: "Scanning..." })
      console.log(device.name)

      if (error) {
        this.setState({ info: "ERROR: " + error.message })
        return
      }

      if (device.name === 'Adafruit Bluefruit LE') {
        this.setState({ info: "Bluefruit LE Found", app_state: "BLE_initialized" })
        this.manager.stopDeviceScan()
        this.device = device;
      }
    });
  }

  connect = async device => {
    try {
      this.setState({ info: "Connecting..." })
      const connectDevice = await device.connect();
      this.setState({ info: "Discovering services and characteristics", app_state: "BLE_connected" })
      const discoverDevice = await connectDevice.discoverAllServicesAndCharacteristics();
      this.setState({ info: "Setting notifications" })
      this.setState({ info: "Listening..." });
      this.setupNotifications(discoverDevice)
    } catch (error) {
      this.setState({ info: "ERROR: " + error.message })
    }
  }


  async setupNotifications(device) {
    device.monitorCharacteristicForService(
      this.service, this.characteristicN, (error, characteristic) => {
        if (error) {
          this.setState({ info: "ERROR: " + error.message })
          return
        }
        this.updateValue(characteristic.uuid, characteristic.value)
      }
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <Appbar.Header style={{ backgroundColor: '#3B5249' }}>
          <Appbar.Content title="SmartSole" />
        </Appbar.Header>
        {this.state.app_state !== "BLE_connected"
          ?
          <View style={styles.buttonCard} >
            <View style={styles.boldText}>
              {/* <Text>{this.state.info}</Text>
                  <Text>{this.state.app_state}</Text> */}
            </View>
            {this.state.app_state === "start"
              ?
              <TouchableOpacity onPress={this.scan}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>Search for Device</Text>
                </View>
              </TouchableOpacity>
              :
              <TouchableOpacity onPress={() => this.connect(this.device)}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>Connect to Device</Text>
                </View>
              </TouchableOpacity>}
          </View>
          : <></>
        }

        {(this.state.app_state === "BLE_connected") && (
          <View style={{ flex: 1, padding: 20 }}>
            <Box toeColor={this.state.toe} leftColor={this.state.left} rightColor={this.state.right} heelColor={this.state.heel} />
          </View>
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white'
  },
  buttonCard: {
    flex: 1,
    backgroundColor: 'ivory',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 10
  },
  boxCard: {
    flex: 1,
    margin: 10
  },
  button: {
    margin: 10,
    width: 200,
    alignItems: 'center',
    backgroundColor: 'gray',
    borderWidth: 3,
    borderRadius: 20,
  },
  buttonText: {
    textAlign: 'center',
    padding: 20,
    color: 'blue',
    fontWeight: 'bold',
    fontSize: 20
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: 20
  },
  archContainer: {
    flex: 1,
    borderWidth: 1
  },
  box: {
    height: 100,
    width: 100,
    borderWidth: 2
  },
  shadowStylesStrong: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6.27,
    elevation: 10,
  },
});


function Box({ toeColor, leftColor, rightColor, heelColor }) {
  function heatMapColorforValue(value, multiplier) {
    let h = (1.0 - value) * 240 * multiplier
    if (h > 240)
      h = 240;
    return "hsl(" + h + ", 100%, 50%)";
  }


  return (
    <>
      <Svg style={styles.shadowStylesStrong} width="100%" height="100%" viewBox="0 0 159 407" fill="none" xmlns="http://www.w3.org/2000/Svg">
        <Path strokeWidth="3" stroke="white" fill="blue" id="outline" d="M26.5 198.5C29.984 212.21 32.5 233.5 32.5 233.5C32.5 233.5 36.7942 249.388 32.5 266.5C28.1566 283.808 7.1776 306.857 4.50003 324.5C0.885838 348.314 0.515897 366.981 16.5 385C29.9072 400.114 43.7988 405.821 64 405.5C83.4866 405.191 96.7899 399.774 109.5 385C121.26 371.33 123.267 364.9 128 347.5C141.923 296.313 128.99 257.798 142.5 206.5C147.235 188.522 153.909 179.409 156.5 161C158.786 144.758 158.276 135.306 156.5 119C152.107 78.6644 148.134 49.6699 118 22.5C109.351 14.7017 104.371 9.67549 93.5 5.50001C77.0949 -0.800954 64.6213 -1.49534 48.5 5.50001C38.5396 9.82203 33.8597 14.5172 26.5 22.5C10.4502 39.9087 4.50003 79 4.50003 79C4.50003 79 -4.11339 130.157 4.50003 161C9.15546 177.67 22.2371 181.725 26.5 198.5Z" />
        <Path fill={heatMapColorforValue(toeColor, 5)} id="toe5" d="M143.802 87.8837C140.098 97.8116 129.887 104.337 116.202 106.767C102.529 109.195 85.4865 107.51 68.3275 101.108C51.1684 94.705 37.1877 84.8139 28.4478 74.023C19.6996 63.2219 16.2589 51.6028 19.9634 41.6749C23.6679 31.7469 33.8788 25.2217 47.5641 22.7914C61.2365 20.3634 78.2793 22.0482 95.4383 28.4509C112.597 34.8535 126.578 44.7447 135.318 55.5355C144.066 66.3367 147.507 77.9557 143.802 87.8837Z" />
        <Path fill={heatMapColorforValue(toeColor, 4)} id="toe4" d="M135.109 85.1869C131.95 93.6529 123.238 99.2293 111.534 101.308C99.8438 103.384 85.2663 101.944 70.5861 96.466C55.9059 90.9882 43.9482 82.5271 36.4752 73.3005C28.994 64.0636 26.0642 54.1431 29.2231 45.6772C32.3821 37.2112 41.0943 31.6348 52.7977 29.5564C64.4881 27.4803 79.0656 28.9204 93.7458 34.3981C108.426 39.8759 120.384 48.337 127.857 57.5636C135.338 66.8005 138.268 76.721 135.109 85.1869Z" />
        <Path fill={heatMapColorforValue(toeColor, 3)} id="toe3" d="M125.113 81.755C122.474 88.8274 115.19 93.4995 105.376 95.2424C95.5749 96.983 83.3472 95.7762 71.0298 91.1801C58.7123 86.584 48.6829 79.4859 42.4176 71.7503C36.144 64.0045 33.7011 55.7029 36.3401 48.6306C38.979 41.5582 46.2628 36.8861 56.077 35.1432C65.8783 33.4026 78.106 34.6094 90.4234 39.2055C102.741 43.8016 112.77 50.8997 119.036 58.6353C125.309 66.3811 127.752 74.6826 125.113 81.755Z" />
        <Path fill={heatMapColorforValue(toeColor, 2)} id="toe2" d="M117.267 77.6078C115.226 83.0775 109.585 86.7096 101.944 88.0667C94.315 89.4214 84.7897 88.483 75.1896 84.9008C65.5894 81.3186 57.7777 75.7881 52.9012 69.7672C48.0164 63.7361 46.1335 57.2965 48.1744 51.8268C50.2154 46.3571 55.8564 42.7249 63.498 41.3679C71.1266 40.0131 80.6518 40.9516 90.252 44.5337C99.8522 48.1159 107.664 53.6465 112.54 59.6674C117.425 65.6985 119.308 72.1381 117.267 77.6078Z" />
        <Path fill={heatMapColorforValue(toeColor, 1)} id="toe1" d="M106.846 73.5127C105.447 77.2642 101.567 79.7815 96.2544 80.7249C90.955 81.666 84.327 81.0152 77.6401 78.52C70.9531 76.0248 65.5189 72.1748 62.1313 67.9923C58.7354 63.7995 57.4529 59.3561 58.8527 55.6046C60.2525 51.8531 64.1323 49.3359 69.4447 48.3925C74.7441 47.4514 81.372 48.1022 88.059 50.5973C94.746 53.0925 100.18 56.9425 103.568 61.125C106.964 65.3178 108.246 69.7613 106.846 73.5127Z" />

        <Path fill={heatMapColorforValue(rightColor, 5)} id="right5" d="M147.661 172.805C144.838 187.682 139.115 200.524 132.17 209.262C125.208 218.021 117.116 222.549 109.535 221.11C101.955 219.672 96.0845 212.493 92.8163 201.792C89.5556 191.117 88.9362 177.071 91.7598 162.195C94.5834 147.318 100.306 134.476 107.251 125.738C114.213 116.979 122.305 112.451 129.886 113.89C137.466 115.328 143.337 122.507 146.605 133.208C149.865 143.883 150.485 157.929 147.661 172.805Z" />
        <Path fill={heatMapColorforValue(rightColor, 4)} id="right4" d="M143.987 171.456C141.572 184.18 136.678 195.16 130.742 202.629C124.789 210.118 117.887 213.969 111.438 212.745C104.989 211.521 99.9774 205.409 97.1829 196.259C94.3961 187.135 93.8654 175.125 96.2805 162.401C98.6956 149.677 103.59 138.696 109.526 131.228C115.478 123.739 122.381 119.888 128.83 121.112C135.279 122.336 140.29 128.448 143.085 137.597C145.872 146.721 146.402 158.731 143.987 171.456Z" />
        <Path fill={heatMapColorforValue(rightColor, 3)} id="right3" d="M139.951 170.333C137.982 180.702 133.964 189.639 129.084 195.709C124.188 201.798 118.519 204.899 113.229 203.895C107.938 202.891 103.8 197.929 101.475 190.469C99.1581 183.033 98.6943 173.245 100.662 162.876C102.63 152.507 106.648 143.569 111.529 137.499C116.425 131.41 122.094 128.309 127.384 129.313C132.675 130.317 136.813 135.28 139.138 142.739C141.455 150.175 141.919 159.963 139.951 170.333Z" />
        <Path fill={heatMapColorforValue(rightColor, 2)} id="right1" d="M127.655 166.915C126.786 171.491 125.067 175.432 123.013 178.105C120.939 180.803 118.631 182.088 116.573 181.698C114.515 181.307 112.838 179.265 111.898 175.995C110.966 172.755 110.809 168.459 111.678 163.883C112.546 159.307 114.266 155.367 116.32 152.694C118.394 149.995 120.702 148.71 122.76 149.101C124.818 149.491 126.495 151.533 127.435 154.803C128.367 158.043 128.523 162.339 127.655 166.915Z" />
        <Path fill={heatMapColorforValue(rightColor, 1)} id="right2" d="M134.125 169.286C132.624 177.192 129.651 184.018 126.08 188.664C122.49 193.335 118.403 195.681 114.663 194.971C110.924 194.262 107.981 190.581 106.352 184.919C104.732 179.288 104.466 171.848 105.967 163.942C107.467 156.036 110.441 149.21 114.011 144.564C117.601 139.893 121.688 137.547 125.428 138.257C129.168 138.966 132.111 142.647 133.74 148.309C135.359 153.94 135.625 161.38 134.125 169.286Z" />


        <Circle cx="49" cy="144" r="43.5" fill={heatMapColorforValue(leftColor, 5)} id="left5" />
        <Circle cx="48.5" cy="143.5" r="37" fill={heatMapColorforValue(leftColor, 4)} id="left4" />
        <Circle cx="49" cy="144" r="30.5" fill={heatMapColorforValue(leftColor, 3)} id="left3" />
        <Circle cx="48.5" cy="143.5" r="23" fill={heatMapColorforValue(leftColor, 2)} id="left2" />
        <Circle cx="49" cy="144" r="12.5" fill={heatMapColorforValue(leftColor, 1)} id="left1" />

        <Circle cx="65.5" cy="342.5" r="54" fill={heatMapColorforValue(heelColor, 5)} id="heel5" />
        <Circle cx="65" cy="342" r="46.5" fill={heatMapColorforValue(heelColor, 4)} id="heel4" />
        <Circle cx="65.5" cy="342.5" r="38" fill={heatMapColorforValue(heelColor, 3)} id="heel3" />
        <Circle cx="65" cy="342" r="28.5" fill={heatMapColorforValue(heelColor, 2)} id="heel2" />
        <Circle cx="65.5" cy="342.5" r="15" fill={heatMapColorforValue(heelColor, 1)} id="heel1" />

      </Svg>
    </>
  );
}
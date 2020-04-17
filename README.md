![Sifir Logo](./docs/images/logo_onLightBG_tealLogo_darkText.png)

# Sifir Desktop App and UI
Runs as on your computer/pi to securley bridge communciation between your Bitcoin and Lightning nodes (via Cyphernode) and the Sifir mobile app.

## :warning:  WARNING: ALPHA SOFTWARE :warning:
Sifir is very much WIP. 

## Requirements
- Docker
- Cyphernode installed: https://github.com/SatoshiPortal/cyphernode
- [Sifir Bitcoin Mobile Wallet Apk](https://github.com/Sifir-io/sifir-mobile-wallet/releases) OR Google play (Coming soon) to pair your phone.

## Build and Setup Instructions
1. Run: `git clone https://github.com/Sifir-io/cyphernode-app.git`
2. Run `cd cyphernode-app && ./build.sh`
3. Edit `.env` file with your favorite text editor (IE Vim) and change the following values to match your Cyphernode installation:
```
      - CYPHERNODE_API_KEY=api key from cyphernode
      - CYPHERNODE_API_KEY_ID=api key id from cyphernode
      - CYPHERNODE_ONION_URL=http://[cyphernode-traefik-torr-hiddenservice-hostname]:[traefik-hiddenservice-torr-port]
```
a. `CYPHERNODE_API_KEY` & `CYPHERNODE_API_KEY_ID` can be found :
[PATH ON A TYPICAL INSTALL]

a. Note: `CYPHERNODE_ONION_URL` , you need the URL *and* the Treafik port your Tor hidden service is running on in a typical cyphernode installation with Tor service enabled:
#FIXME move to seperate scrippt
```bash
CN_INSTALL_PATH="PATH TO YOUR CYPHERNODE INSTALL"
# Firstline matching in $CN_INSTALL_PATH/dist/.cyphernodeconf/tor/torrc is http port
onion_url_port=$(awk '/HiddenServicePort.*traefik/  {print $2;exit}' $CN_INSTALL_PATH/dist/.cyphernodeconf/tor/torrc )
onion_url=$cat $CN_INSTALL_PATH/dist/.cyphernodeconf/tor/traefik/hidden_service/hostname
echo "CYPHERNODE_ONION_URL=http://$onion_url:$onion_url_port"
``

** IMPORTANT** Do not forget to add Trafiks port number to your Onion URL 
4. Run `./run.sh ~/cyphernode/dist/cyphernode/certs/cert.pem` replacing `~/cyphernode/dist/cyphernode/certs/cert.pem` with the path to Cyphernode's certifcate. 
_Note:_ If you have installed Cyphernode under a special user different than the one you login to your system with you might want to the `cert.pem` file from cyphernode's folder to the folder sifir app is installed under and point to it to prevent having to use sudo to access every time you want to run Sifir.

## Sifir setup and Pairing with mobile wallet

1. Open your browser and go to 'http://localhost:3011' you should see Sifir App 
2. If this is a fresh install click 'Go To Setup'
3. Enter a password to encrypt your PGP keys with (PGP keys will be used to sign and encrypt all communication coming in and out of Sifir), re-enter your password in the confirmation box.
4. Click on 'Make Keys'
5. Wait for Keys to generate and click on 'Continue to Pairing'
6. Select the method you would like to pair your phone with 'Tor' or 'Sifir Sync'
8. Enter a *lowercase only* name for this device, and re-enter your password again. Click 'Show pairing QR code'
9. Download Sifir's mobile App and scan the QR code !
10. Enjoy your awesome private and secure Bitcoin Mobile Wallet :) 
![Sifir Setup and Pairing UI](./docs/images/sifir-ui-setup-pair-animated.gif)



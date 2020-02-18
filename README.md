![Sifir Logo](./docs/images/logo_onLightBG_tealLogo_darkText.png)

# Cyphernode App and UI
Runs as a Cyphernode app to securley bridge communciation between Cyphernode and Sifir mobile wallet.

## :warning:  WARNING: ALPHA SOFTWARE :warning:
Sifir is very much WIP and is meant for reckless Bitcoiners looking for a badass wallet. Plebs comeback later please.

## Requirements
- Docker
- Cyphernode installed: https://github.com/SatoshiPortal/cyphernode
- Sifir Mobile App [LINK TO REPO] / Google play to pair your phone.

## Build and Setup Instructions
1. Run: `git clone https://github.com/Sifir-io/cyphernode-app.git`
2. Run `cd cyphernode-app && ./build.sh`
3. Edit `.env` file with your favorite text editor (IE Vime) and change the following values to match your Cyphernode installation:
```
      - CYPHERNODE_API_KEY=api key from cyphernode
      - CYPHERNODE_API_KEY_ID=api key id from cyphernode
      - CYPHERNODE_ONION_URL=http://yourCyphernodeOnionUrl.onion
```
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



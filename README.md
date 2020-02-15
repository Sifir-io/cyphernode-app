# Sifir - Cypheronde App and UI

Runs as a Cyphernode app to securley bridge communciation between Cyphernode and Sifir mobile wallet.

## Requirements
- Docker
- Cyphernode installed.
- Sifir Mobile App [LINK TO REPO] / Google play to pair your phone.

## Build and Setup Instructions
1. git clone 
2. run `cd <dir> & ./build`
3. edit `docker-compose.yaml` and change the following values to match your Cyphernode installation:
```
      - CYPHERNODE_API_KEY=734f3be95e2b0637cb605b428f2d1a1df970cff9b5bcc1c0496e9d8acb221e8a
      - CYPHERNODE_API_KEY_ID=3
      ## Tor: The Tor v3 hostname for your CN installation
      - CYPHERNODE_ONION_URL=http://gt5gt3knblzpaq3mcv2b7lhbh7o3mxh6x3tqw3hqyirwjytuz2gornyd.onion
```
4. run `./run.sh ~/cyphernode/dist/cyphernode/certs/cert.pem` replacing `~/cyphernode/dist/cyphernode/certs/cert.pem` with the path to Cyphernode's certifcate. Note: If you have installed Cyphernode under a special user different than the one you login to your system with you might want to the `cert.pem` file from cyphernode's folder to the folder sifir app is installed under and point to it to prevent having to use sudo to access every time you want to run Sifir.

## Pairing phone with mobile wallet

1. Open your browser and head to 'http://localhost:3011'
2. Setup keys for your node.
3. Download Sifir App [MAKE THIS A LINK]
4. Scan the QR code with the App.
5. Enjoy an ananymous, private and secure Bitcoin wallet!
6. STAR THIS REPO ! :)


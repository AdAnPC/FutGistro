/**
 * Google Drive Picker integration for FutGistro
 */

const DrivePicker = {
    apiKey: 'AIzaSyBy8qXF16hYhjJ31YMDKQFdT6HWg4S6p50',
    clientId: '227228772178-h89hk5pu4t9j8mvstcga70ftgntajpe1.apps.googleusercontent.com',
    appId: '227228772178',
    accessToken: null,
    pickerApiLoaded: false,
    gisLoaded: false,
    onFilePickedCallback: null,

    init() {
        // Load the Google API Loader script
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.onload = () => {
            gapi.load('picker', () => { this.pickerApiLoaded = true; });
        };
        document.body.appendChild(script1);

        // Load the Google Identity Services script
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = () => { this.gisLoaded = true; };
        document.body.appendChild(script2);
    },

    async open(callback) {
        this.onFilePickedCallback = callback;
        
        if (!this.accessToken) {
            this.authenticate();
        } else {
            this.createPicker();
        }
    },

    authenticate() {
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response) => {
                if (response.error !== undefined) {
                    throw (response);
                }
                this.accessToken = response.access_token;
                this.createPicker();
            },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    createPicker() {
        if (this.pickerApiLoaded && this.accessToken) {
            const view = new google.picker.View(google.picker.ViewId.DOCS);
            view.setMimeTypes('image/png,image/jpeg,image/jpg,application/pdf');
            
            const picker = new google.picker.PickerBuilder()
                .enableFeature(google.picker.Feature.NAV_HIDDEN)
                .setAppId(this.appId)
                .setOAuthToken(this.accessToken)
                .addView(view)
                .addView(new google.picker.DocsUploadView())
                .setDeveloperKey(this.apiKey)
                .setCallback(this.pickerCallback.bind(this))
                .build();
            picker.setVisible(true);
        }
    },

    pickerCallback(data) {
        if (data.action === google.picker.Action.PICKED) {
            const document = data.docs[0];
            const fileId = document.id;
            const url = `https://lh3.googleusercontent.com/d/${fileId}`;
            if (this.onFilePickedCallback) {
                this.onFilePickedCallback(url, fileId);
            }
        }
    }
};

// Initialize DrivePicker on load
DrivePicker.init();

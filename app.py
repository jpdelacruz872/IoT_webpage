import os
import requests
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from supabase import create_client, Client
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

load_dotenv()

app = Flask(__name__)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
app.secret_key = os.environ["SERVER_KEY"]
google_calendar_key = os.environ.get("GOOGLE_CALENDAR_KEY")

supabase: Client = create_client(url, key)

@app.route('/log_in')
def log_in():
    return render_template('log_in.html')

@app.route('/log_in', methods=['POST'])
def log_account():
    data = request.get_json()

    email_or_user = data.get('email_or_user')
    password = data.get('password')

    try:
        query = f"email.eq.{email_or_user},user_name.eq.{email_or_user}"
        response = supabase.table('Users').select('*').or_(query).execute()

        if len(response.data) == 0:
            return 'User not found', 404 
        
        user = response.data[0]

        stored_hashed_password = user['password']
        
        if check_password_hash(stored_hashed_password, password):

            user_data = user.copy()

            if 'password' in user_data:
                del user_data['password']

            session['user'] = user_data

            return jsonify({
                'message': 'Succesful log in',
                'user': user_data
            }), 200
        
        else:
            return 'Incorrect password', 401
        
    except Exception as e:
        return f"Error {e}", 400
    
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/sign_up')
def sign_up():
    return render_template('sign_up.html')

@app.route('/sign_up', methods=['POST'])
def sign_up_info():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    last_name = data.get('last_name')
    user_name = data.get('user_name')
    organization = data.get('organization')
    phone = data.get('phone')
    hash = generate_password_hash(password)

    try:
        response = supabase.table('Users').insert({
            "email": email,
            "password": hash,
            "first_name": name,
            "last_name": last_name,
            "user_name": user_name,
            "school_name": organization,
            "phone_number": phone,
        }).execute()

        return 'User created correctly'
    
    except Exception as e:
        return f"Error: {e}", 400

@app.route('/services')
def services():
    return render_template('services.html')

@app.route('/calendar')
def calendar():
    return render_template('calendar.html')

@app.route('/account')
def account():
    return render_template('account.html')

@app.route('/get_session')
def get_session():
    user = session.get('user')
    return jsonify({"user": user})

@app.route('/log_out', methods=['POST'])
def log_out():
    session.pop('user', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/calendar/upcoming_events')
def get_next_events():
    calendar_id = 'fredfactory.tecmty@gmail.com'
    today = datetime.now(timezone.utc).isoformat()
    base_url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"

    api_params = {
        'key': google_calendar_key,
        'timeMin': today,
        'maxResults': 3,
        'singleEvents': 'True',
        'orderBy': 'startTime' 
    }
    
    try:
        response = requests.get(base_url, params=api_params)
        data = response.json()

        if response.status_code != 200:
            print('GOOGLE API ERROR: ', data)
            return jsonify({'error': 'google API blocked the request'}), response.status_code
        return jsonify(data.get('items', [])), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1717, debug=True)
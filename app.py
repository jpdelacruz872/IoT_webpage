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
google_sheets_key = os.environ.get("GOOGLE_SHEETS_KEY")
sheets_id = os.environ.get("SHEETS_ID")

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

@app.route('/printing')
def printing():
    return render_template('printing.html')

@app.route('/printing/queue', methods=['GET'])
def printing_queue_list():
    table = os.environ.get('PRINT_QUEUE_TABLE', 'print_queue')
    try:
        result = (supabase.table(table)
                  .select('*')
                  .eq('status', 'queued')
                  .order('created_at', desc=False)
                  .execute())
        return jsonify(result.data or []), 200
    except Exception as e:
        print(f"[printing_queue_list] ERROR: {type(e).__name__}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/printing/queue', methods=['POST'])
def printing_queue_add():
    data = request.get_json(silent=True) or {}
    user_name = (data.get('user_name') or '').strip()
    job_name = (data.get('job_name') or '').strip()
    printer = data.get('printer') or None
    duration_min = data.get('duration_min')
    if not user_name or not job_name:
        return jsonify({'error': 'user_name and job_name required'}), 400
    table = os.environ.get('PRINT_QUEUE_TABLE', 'print_queue')
    try:
        row = {
            'user_name': user_name,
            'job_name': job_name,
            'printer': printer,
            'status': 'queued',
        }
        if duration_min is not None:
            row['duration_min'] = int(duration_min)
        result = supabase.table(table).insert(row).execute()
        return jsonify(result.data[0] if result.data else {}), 201
    except Exception as e:
        print(f"[printing_queue_add] ERROR: {type(e).__name__}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/inventory')
def inventory():
    return render_template(
        'inventory.html',
        supabase_url=url,
        supabase_anon_key=key,
        inventory_table=os.environ.get('INVENTORY_TABLE', 'Inventory'),
        latency_table=os.environ.get('LATENCY_TABLE', 'latency_test'),
    )

@app.route('/inventory/latency_ping', methods=['POST'])
def inventory_latency_ping():
    data = request.get_json(silent=True) or {}
    trial_id = data.get('trial_id')
    if not trial_id:
        return jsonify({'error': 'trial_id required'}), 400
    table = os.environ.get('LATENCY_TABLE', 'latency_test')
    try:
        result = supabase.table(table).insert({'trial_id': trial_id}).execute()
        print(f"[latency_ping] inserted into {table}: {result.data}")
        return jsonify({'trial_id': trial_id}), 200
    except Exception as e:
        print(f"[latency_ping] ERROR inserting into {table!r}: {type(e).__name__}: {e}")
        return jsonify({'error': f"{type(e).__name__}: {e}", 'table': table}), 500

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
    
@app.route('/recent_papers')
def get_recent_papers():
    range = 'Papers!A1:D1015'
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheets_id}/values/{range}?key={google_sheets_key}"
    try:
        response = requests.get(url)
        data = response.json()

        if (response.status_code != 200):
            print('GOOGLE API ERROR: ', data)
            return jsonify({'error': 'Google API error '}), 400
        
        values = data.get('values', [])

        papers = []
        for row in values:
            if len(row) == 4:
                papers.append({
                    'title': row[0],
                    'abstract': row[1],
                    'link': row[2],
                    'date': row[3]
                })
        
        def parse_date(date):
            try:
                return datetime.strptime(date, "%d/%m/%Y")
            
            except ValueError:
                return datetime.min
        
        papers.sort(key=lambda p: parse_date(p['date']), reverse=True)

        recent_papers = papers[:6]

        return jsonify({'papers': recent_papers}), 200
    
    except Exception as e:
        print(f'Error obtaining papers: {e}')
        return jsonify({'error': 'Could not obtain papers'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1717, debug=True)
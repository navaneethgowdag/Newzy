# app.py
from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime, timedelta

import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

GNEWS_API_KEY = os.getenv("api_key")

@app.route('/health')
def health():
    return jsonify({'status': 'ok'}), 200   

@app.route('/')
def index():
    """Serve the main newspaper page."""
    return render_template('index.html')


@app.route('/api/news', methods=['GET'])
def fetch_news():
    """
    Fetch news from GNews API.
    Query params:
        - q: search query (default: "latest news")
        - from_date: start date YYYY-MM-DD (default: yesterday)
        - to_date: end date YYYY-MM-DD (default: today)
        - lang: language (default: en)
    """
    # Get parameters from request
    query = request.args.get('q', 'latest news')
    lang = request.args.get('lang', 'en')

    # Date handling
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

    from_date = request.args.get('from_date', yesterday)
    to_date = request.args.get('to_date', today)

    # Validate dates
    try:
        datetime.strptime(from_date, '%Y-%m-%d')
        datetime.strptime(to_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({
            'success': False,
            'message': 'Invalid date format. Use YYYY-MM-DD.'
        }), 400

    if from_date > to_date:
        return jsonify({
            'success': False,
            'message': 'The From date cannot be later than the To date.'
        }), 400

    # Build GNews API request.
    # The frontend accepts YYYY-MM-DD, but GNews expects RFC3339 timestamps
    # for the `from` and `to` search parameters.
    url = "https://gnews.io/api/v4/search"

    from_dt = datetime.strptime(from_date, '%Y-%m-%d')
    to_dt = datetime.strptime(to_date, '%Y-%m-%d') + timedelta(days=1)

    gnews_from = from_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    # Use the next day's midnight as an exclusive upper boundary so the
    # selected `to_date` includes the entire calendar day.
    gnews_to = to_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    params = {
        "q": query,
        "from": gnews_from,
        "to": gnews_to,
        "lang": lang,
        "sortby": "publishedAt",
        "apikey": GNEWS_API_KEY,
        "max": 10  # GNews free tier allows max 10
    }

    try:
        print(">>> GNEWS REQUEST STARTED")

        response = requests.get(url, params=params, timeout=10)

        print(">>> GNEWS STATUS:", response.status_code)
        print(">>> GNEWS BODY:", response.text)
        data = response.json()

        if response.status_code == 200 and "articles" in data:
            # Process articles for frontend
            articles = []
            for article in data["articles"]:
                articles.append({
                    'title': article.get('title', 'No Title'),
                    'description': article.get('description', 'No description available.'),
                    'content': article.get('content', ''),
                    'url': article.get('url', '#'),
                    'image': article.get('image', ''),
                    'source': article.get('source', {}).get('name', 'Unknown Source'),
                    'publishedAt': article.get('publishedAt', ''),
                    'publishedFormatted': format_date(article.get('publishedAt', ''))
                })

            return jsonify({
                'success': True,
                'totalArticles': data.get('totalArticles', 0),
                'articles': articles,
                'query': query,
                'from_date': from_date,
                'to_date': to_date
            })
        else:
            error_msg = data.get('message', f'HTTP Status {response.status_code}')
            return jsonify({
                'success': False,
                'message': error_msg
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'message': 'Request timed out. Please try again.'
        }), 504
    except requests.exceptions.ConnectionError:
        return jsonify({
            'success': False,
            'message': 'Could not connect to news service.'
        }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'An unexpected error occurred: {str(e)}'
        }), 500


def format_date(date_string):
    """Format ISO date string to readable format."""
    if not date_string:
        return 'Unknown Date'
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return dt.strftime('%B %d, %Y — %I:%M %p')
    except (ValueError, AttributeError):
        return date_string


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

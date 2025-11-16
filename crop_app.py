from flask import Flask, render_template, request
import numpy as np
import joblib

app = Flask(__name__)

# Load the trained model saved via joblib.dump(..., 'crop_app/crop_app')
# File sits next to this script, no extension.
model = joblib.load('crop_app')

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/form')
def form_page():
    return render_template('form.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Expects inputs in this order (must match your training columns):
    N, P, K, temperature, humidity, ph, rainfall
    """
    try:
        N = float(request.form['N'])
        P = float(request.form['P'])
        K = float(request.form['K'])
        temperature = float(request.form['temperature'])
        humidity = float(request.form['humidity'])
        ph = float(request.form['ph'])
        rainfall = float(request.form['rainfall'])

        X = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        prediction = model.predict(X)[0]  # e.g. 'rice'
        return render_template('result.html', crop=prediction)

    except Exception as e:
        return render_template('result.html', crop=f"Error: {e}")

if __name__ == "__main__":
    # Visit http://127.0.0.1:5000/
    app.run(debug=True)




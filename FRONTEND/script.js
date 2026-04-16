function goto(page) {
window.location.href = page;
}

const home_btn = document.getElementById('home_btn');
const services_btn = document.getElementById('services_btn');
const calendar_btn = document.getElementById('calendar_btn');
const account_btn = document.getElementById('account_btn');
const login_btn = document.getElementById('login_btn');
const logo1_btn = document.getElementById('logo_btn');
const logo2_btn = document.getElementById('name_btn');

home_btn.addEventListener('click', () => goto('home.html'));
services_btn.addEventListener('click', () => goto('services.html'));
calendar_btn.addEventListener('click', () => goto('calendar.html'));
account_btn.addEventListener('click', () => goto('account.html'));
login_btn.addEventListener('click', () => goto('index.html'));
logo1_btn.addEventListener('click', () => goto('home.html'));
logo2_btn.addEventListener('click', () => goto('home.html'));

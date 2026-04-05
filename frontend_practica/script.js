const newsList = [
  "Something interesting happened in the FrED Factory project...",
  "New sections are being integrated into the official FrED page.",
  "Users will be able to view recent papers and workshop schedules.",
  "A virtual factory simulator and inventory tools are being added."
];

let currentNews = 0;

function showNews() {
  const newsText = document.getElementById("newsText");
  if (newsText) {
    newsText.textContent = newsList[currentNews];
  }
}

function nextNews() {
  currentNews++;
  if (currentNews >= newsList.length) {
    currentNews = 0;
  }
  showNews();
}

function previousNews() {
  currentNews--;
  if (currentNews < 0) {
    currentNews = newsList.length - 1;
  }
  showNews();
}

showNews();
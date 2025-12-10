let index = 0;
const total = 5;
const slides = document.getElementById("homeslider");

function showSlide(i) {
  index = (i + total) % total; 
  slides.style.transform = `translateX(-${index * 100}%)`;
}

document.getElementById("next").onclick = () => showSlide(index + 1);
document.getElementById("prev").onclick = () => showSlide(index - 1);
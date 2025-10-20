const drinks = [
  { name: "Matcha Latte", price: "40k", emoji: "🍵", img: "images/matcha.png" },
  { name: "Strawberry Milk", price: "35k", emoji: "🍓", img: "images/strawberry.png" }
];

const menuSection = document.getElementById("menu");

for (let i = 0; i < drinks.length; i++) {
  const item = drinks[i];
  menuSection.innerHTML += `
    <div class="menu-item">
      <img src="${item.img}" alt="${item.name}">
      <p>${item.emoji} <strong>${item.name}</strong></p>
      <p>${item.price}</p>
    </div>
  `;
}

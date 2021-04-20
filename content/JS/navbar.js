let nav_clicked = 0

let navbar = document.getElementById("navbar")
let arrow = document.getElementById("navbar_arrow")

function navbar_mobile_click() {
    console.log("oui")
    if (nav_clicked == 0) {
        navbar.classList.add("navbar_clicked")
        arrow.classList.add("navbar_arrow_clicked")
        nav_clicked = 1
    }
    else {
        navbar.classList.remove("navbar_clicked")
        arrow.classList.remove("navbar_arrow_clicked")
        nav_clicked = 0
    }
}


// let p = new Promise((resolve, reject) => {
//     let a = 2 + 2 ;
//     if(a == 4) {
//         resolve("Success");
//     } else {
//         reject("Failed")
//     }
// })
// p.then((message) => {
//     console.log("this is in the then" + message)
// }).catch((message) => {
//     console.log("this is in the catch" + message)
// })
// -------------------
const userLeft = true;
const userWatchingCat = true;

function watchTutorialPromise() {
    return new Promise((resolve, reject) => {
        if(userLeft) {
            reject({
                name: "User Left",
                message:":("
            })
        } else if(userWatchingCatMeme) {
            reject({
                name: 'User Watching cat Meme',
                message: "WebDevSimplified < Cat"
            })
        } else {
            resolve("Thumbs up and Subscribe")
        }
    })
}

watchTutorialPromise().then((message) => {
    console.log("success" + message)
}).catch((error) => {
    console.log(error.name + " " + error.message)
})
console.log("eee")
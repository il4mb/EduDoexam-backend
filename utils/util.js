function generateRandomString({ length = 10, characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" }) {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const numberToAlphabet = (value) => {
    const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const size = alphabets.length;
    let result = '';
    let number = Math.floor(value);

    while (number > 0) {
        number--;
        result = alphabets[number % size] + result;
        number = Math.floor(number / size);
    }

    return result;
};

const generateId = (number = 1) => {
    const date = new Date();
    const year = date.getFullYear();
    const time = date.getTime()
    return `${numberToAlphabet((time/year)*number)}`.replace(/\s/g, '');
}

module.exports = {
    generateRandomString,
    generateId
}
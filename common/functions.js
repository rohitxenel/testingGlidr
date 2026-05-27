const _ = require("lodash");
const { nanoid, customAlphabet } = require("nanoid");
const Query = require("../queries/mongo/DBQueries"); // Adjust the path if necessary
const Model = require("../models/mongo");
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
const axios = require('axios');
const { ifError } = require("assert");
const countries = require("i18n-iso-countries");
const { countries: countryData } = require("country-data");

// load English names
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

const secretKey = process.env.ENCRYPTION_SECRET || "your-secret-key";
const fixedIV = CryptoJS.enc.Utf8.parse("1234567890123456"); // 16 chars
const fixedKey = CryptoJS.enc.Utf8.parse(secretKey.padEnd(32, "0").slice(0, 32)); // 32 bytes


module.exports.generateSecureCode = (length) => {
  // Character sets
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@$";

  // Combine all character sets
  const allCharacters = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required character type
  const requiredCharacters = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)]
  ];

  // Fill the rest of the code with random characters from allCharacters
  while (requiredCharacters.length < length) {
    const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)];
    requiredCharacters.push(randomChar);
  }

  // Shuffle the array to randomize the positions of required characters
  for (let i = requiredCharacters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [requiredCharacters[i], requiredCharacters[j]] = [requiredCharacters[j], requiredCharacters[i]];
  }

  // Join the array into a single string and return
  return requiredCharacters.join('');
}



module.exports.phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
module.exports.passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;


module.exports.generateString = (length) => nanoid(length);
module.exports.generateNumber = (length) => customAlphabet("123456789", length)();
module.exports.generateCustom = (length, charset) => customAlphabet(charset, length)();

module.exports.toHex = (val) => Buffer.from(val, "utf8").toString("hex");
module.exports.toStr = (val) => Buffer.from(val, "hex").toString("utf8");

module.exports.prettyCase = (str) => {
  if (typeof str === "string" && /^[A-Z_]+$/.test(str)) {
    str = _.lowerCase(str);
    str = _.startCase(str);
  }
  return str;
};

module.exports.createSlug = (name) => {
  const slug = name
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters
    .replace(/-{2,}/g, '-') // Replace consecutive hyphens with a single hyphen
    .trim(); // Trim leading and trailing hyphens

  return slug;
}
module.exports.toDecimals = (val, decimal = 2) => {
  const base = Math.pow(10, decimal);
  return Math.round(val * base) / base;
};

module.exports.toObject = (data, key, val) => {
  if (!Array.isArray(data)) throw new Error("INVALID_DATA");
  if (!key || typeof key !== "string") throw new Error("INVALID_KEY");

  const newObj = {};
  if (data.length > 0) {
    for (const item of data) {
      newObj[item[key] + ""] = !!val ? item[val] : item;
    }
  }
  return newObj;
};
module.exports.generateRandom = function (len) {
  var text = "";
  var possible = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};
module.exports.generateRandomStringAndNumbers = function (len) {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};


module.exports.generateUniqueId = function (length = 12) { // Default length is 12 if not provided
  let numericText = "";
  let alphanumericText = "";
  const numbers = "0123456789";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let numericLength = Math.ceil(length / 2);  // Half the length (rounded up) for numbers
  let alphaLength = length - numericLength;   // Remaining for alphanumeric characters

  // Generate numeric characters
  for (let i = 0; i < numericLength; i++) {
    numericText += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  // Generate alphanumeric characters
  for (let i = 0; i < alphaLength; i++) {
    alphanumericText += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }

  // Combine numeric and alphanumeric parts
  let combined = numericText + alphanumericText;

  // Shuffle the combined string to mix numbers and letters
  combined = combined.split('').sort(() => 0.5 - Math.random()).join('');

  return combined;
};



module.exports.calculateDistance = async (coordinates1, coordinates2) => {
  console.log(coordinates1, coordinates2)
  const [lat1, lon1] = coordinates1;
  const [lat2, lon2] = coordinates2;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  console.log("Calculated Distance:", distance);
  return distance;
}

module.exports.notifyAdmin = async (message) => {
  // Implementation logic here
  // For example, log to console or send an email
  console.log(`Admin Alert: ${message}`);
  // Add more notification logic as needed, e.g., send email
};


module.exports.SendNotifiction = async (type, message) => {
  try {
    const NotifictionId = `Notifiction${uuidv4()}`;

    // Generate an access token for the user

    // Prepare the data for insertion
    const Data = {
      Id: NotifictionId,
      type: type,
      Message: message

    };
    broadcast(type, message);

    await Query.insertOne(Model.Notifiction, Data);

  } catch (error) {
    throw error
  }
};


module.exports.encrypt = (text) => {
  if (typeof text !== "string") {
    if (text === undefined || text === null) return "";
    text = String(text);
  }

  const encrypted = CryptoJS.AES.encrypt(text, fixedKey, {
    iv: fixedIV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
}

module.exports.decrypt = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== "string") return "";
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, fixedKey, {
      iv: fixedIV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error("Decryption failed:", e.message);
    return "";
  }
}


module.exports.encrypter = async (data) => {
  const secretKey = process.env.ENCRYPTER_SECRET_KEY
  try {
    if (!data) throw new Error("data required")
    const hashedKey = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(16); // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', hashedKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const hmac = crypto.createHmac('sha256', hashedKey).update(iv.toString('hex') + encrypted).digest('hex');
    return iv.toString('hex') + ':' + encrypted + ':' + hmac;

  } catch (error) {
    throw error
  }
};


module.exports.decrypter = async (data) => {
  const ENCRYPTER_SECRET_KEY = "YbRTZP5FVQJSZcvMIFnPuX04rkaiveXW5MI6Tj5T9VOAhWWi7PyfOy3hHwrxNzRYjcvL=RGF%zC]E{&8'ue8~NIW3s's9+L5EVaa2@@.O%>>)*<nXVo=NF&S&oa?1=rc~:~PN{v1411!Gvd."
  const hashedKey = crypto.createHash('sha256').update(ENCRYPTER_SECRET_KEY).digest();

  try {
    if (!data) throw new Error("data required");
    const [ivHex, encryptedHex, hmac] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const calculatedHMAC = crypto.createHmac('sha256', hashedKey).update(ivHex + encryptedHex).digest('hex');
    if (calculatedHMAC !== hmac) {
      throw new Error('Data integrity check failed!');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', hashedKey, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted); // Parse back to original object
  } catch (error) {
    console.error('Decryption Error:', error.message);
    throw error;
  }
};


module.exports.generateRandomNumbers = function (len) {
  var text = "";
  var possible = "0123456789";  // Only digits
  for (var i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


module.exports.validateEmailAsync = async (email) => {

  try {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidFormat = regex.test(email);

    if (!isValidFormat) return false;
    return true;
  } catch (error) {
    throw new Error(error);
  }
};



module.exports.calculateTime = async (updatedAt) => {

  try {
    const updatedDate = new Date(updatedAt);
    const currentDate = new Date();

    const diffMilliseconds = currentDate - updatedDate;
    const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));

    return diffMinutes;
  } catch (error) {
    throw new Error(error);
  }
};

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
module.exports.getDistanceAndTime = async (originLat, originLng, destLat, destLng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${GOOGLE_API_KEY}`;

    const response = await axios.get(url);
    if (response.status !== 200 && response.statusText !== 'OK') throw new Error('Invalid response from API');
    return response.data
  } catch (error) {
    console.error('Error fetching distance/time:', error.message);
    const err = new Error('Google Maps API error');
    err.statusCode = 400; // Optional: Set your own HTTP status code
    throw err;
  }
};



module.exports.getAutocomplete = async (input, lat, lng) => {
  console.log({ input, lat, lng });

  const apiKey = process.env.GOOGLE_API_KEY;
  const url = "https://places.googleapis.com/v1/places:autocomplete";

  const body = {
    input,
    origin: { latitude: +lat, longitude: +lng },
    locationBias: {
      circle: {
        center: { latitude: +lat, longitude: +lng },
        radius: 20000
      }
    }
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey
  };

  const response = await axios.post(url, body, { headers });
  console.log("places data", response.data);  // ✅ should print suggestions

  return response.data.suggestions || [];
};


module.exports.getPlaceDetails = async (placeId) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=location`;

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey
  };

  const response = await axios.get(url, { headers });
  const data = response.data;

  if (data.location) {
    return {
      lat: data.location.latitude,
      lng: data.location.longitude
    };
  }

  return null;
};


module.exports.getNearbyPlaces = async (lat, lng, keyword = "") => {
  try {
    console.log({ lat, lng });

    const apiKey = process.env.GOOGLE_API_KEY;
    const baseURL = "https://places.googleapis.com/v1/places:searchText"; // ✅ fixed quotes

    const body = {
      textQuery: keyword && keyword.trim() ? keyword : "tourist attractions",
      locationBias: {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: 10000, // 10 km
        },
      },
    };

    const response = await axios.post(baseURL, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.rating,places.businessStatus",
      },
    });

    if (!response.data || !response.data.places) {
      throw new Error("No nearby places found");
    }

    return response.data.places;
  } catch (error) {
    console.error(
      "Error fetching nearby places:",
      error.response?.data || error.message
    );

    const err = new Error(
      error.response?.data?.error?.message || "Google Maps API error"
    );
    err.statusCode = 400;
    throw err;
  }
};





module.exports.getCountryDetailsByCode = async (code) => {
  try {
    const dialCode = String(code); // e.g. '+1'

    // Force +1 to United States
    if (dialCode === "+1") {
      return {
        countryName: "United States",
        countryCode: "US",
        currency: "USD",
        dialCode,
      };
    }

    // Otherwise, find country normally
    const result = Object.values(countryData).find(
      (c) =>
        Array.isArray(c.countryCallingCodes) &&
        c.countryCallingCodes.includes(dialCode)
    );

    if (!result) return null;

    return {
      countryName: countries.getName(result.alpha2, "en"),
      countryCode: result.alpha2,
      currency: result.currencies?.[0] || "N/A",
      dialCode,
    };
  } catch (error) {
    throw error;
  }
};


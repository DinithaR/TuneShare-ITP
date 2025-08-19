import favicon from "./favicon.png"
import logo from "./logo.png"
import navbarLogo from "./navbarLogo.png"
import search_icon from "./search_icon.png"
import menu_icon from "./menu_icon.svg"
import close_icon from "./close_icon.svg"
import hero_img from "./hero_img.jpg"
import location_icon from './location_icon.svg'
import arrow_icon from './arrow_icon.svg'
import instrument_image1 from './instrument_image1.jpg'
import instrument_image2 from './instrument_image2.jpg'
import instrument_image3 from './instrument_image3.jpg'
import instrument_image4 from './instrument_image4.jpg'
import banner_instrument_image from './banner_instrument_image.jpg'
import check_icon from './check_icon.svg'
import filter_icon from './filter_icon.svg'
import calendar_icon_colored from './calendar_icon_colored.svg'
import user_profile from './user_profile.jpg'
import edit_icon from './edit_icon.svg'
import dashboardIcon from './dashboardIcon.svg'
import dashboardIconColored from './dashboardIconColored.svg'
import addIcon from './addIcon.svg'
import addIconColored from './addIconColored.svg'
import listIcon from './listIcon.svg'
import listIconColored from './listIconColored.svg'
import instrumentIcon from './instrumentIcon.svg'
import instrumentIconColored from './instrumentIconColored.svg'
import cautionIconColored from './cautionIconColored.svg'
import upload_icon from './upload_icon.svg'
import tick_icon from './tick_icon.svg'
import eye_icon from './eye_icon.svg'
import eye_close_icon from './eye_close_icon.svg'
import delete_icon from './delete_icon.svg'

export const assets = {
    favicon,
    logo,
    navbarLogo,
    search_icon,
    menu_icon,
    close_icon,
    hero_img,
    location_icon,
    arrow_icon,
    instrument_image1,
    instrument_image2,
    instrument_image3,
    instrument_image4,
    banner_instrument_image,
    check_icon,
    filter_icon,
    calendar_icon_colored,
    user_profile,
    edit_icon,
    dashboardIcon,
    dashboardIconColored,
    addIcon,
    addIconColored,
    listIcon,
    listIconColored,
    instrumentIcon,
    instrumentIconColored,
    cautionIconColored,
    upload_icon,
    tick_icon,
    eye_icon,
    eye_close_icon,
    delete_icon,
}

export const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Instruments", path: "/instruments" },
    { name: "Bookings", path: "/my-bookings" }
]

export const ownerMenuLinks = [
    { name: "Dashboard", path: "/owner", icon: dashboardIcon, coloredIcon: dashboardIconColored },
    { name: "Add Instrument", path: "/owner/add-instrument", icon: addIcon, coloredIcon: addIconColored },
    { name: "Manage Instruments", path: "/owner/manage-instruments", icon: instrumentIcon, coloredIcon: instrumentIconColored },
    { name: "Manage Bookings", path: "/owner/manage-bookings", icon: listIcon, coloredIcon: listIconColored },
]

export const cityList = ['Colombo', 'Malabe', 'Avissavella', 'Matara']

export const dummyInstrumentData = [
    {
        "_id": "67ff5bc069c03d4e45f30b77",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "brand": "Yamaha",
        "model": "C90",
        "image": instrument_image1,
        "category": "abc",
        "pricePerDay": 30000,
        "location": "Colombo",
        "description": "This is a sample description.",
        "isAvailable": true,
        "createdAt": "2025-04-16T07:26:56.215Z",
    },
    {
        "_id": "67ff6b758f1b3684286a2a65",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "brand": "Roland",
        "model": "A100",
        "image": instrument_image2,
        "category": "abc",
        "pricePerDay": 13000,
        "location": "Malabe",
        "description": "This is a sample description.",
        "isAvailable": true,
        "createdAt": "2025-04-16T08:33:57.993Z",
    },
    {
        "_id": "67ff6b9f8f1b3684286a2a68",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "brand": "Yamaha",
        "model": "F100",
        "image": instrument_image3,
        "category": "def",
        "pricePerDay": 20000,
        "location": "Avissavella",
        "description": "This is a sample description.",
        "isAvailable": true,
        "createdAt": "2025-04-16T08:34:39.592Z",
    },
    {
        "_id": "68009c93a3f5fc6338ea7e34",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "brand": "Roland",
        "model": "C200",
        "image": instrument_image4,
        "category": "def",
        "pricePerDay": 25000,
        "location": "Matara",
        "description": "This is a sample description.",
        "isAvailable": true,
        "createdAt": "2025-04-17T06:15:47.318Z",
    }
];

export const dummyMyBookingsData = [
    {
        "_id": "68482bcc98eb9722b7751f70",
        "instrument": dummyInstrumentData[0],
        "user": "6847f7cab3d8daecdb517095",
        "owner": "6847f7cab3d8daecdb517095",
        "pickupDate": "2025-06-13T00:00:00.000Z",
        "returnDate": "2025-06-14T00:00:00.000Z",
        "status": "confirmed",
        "price": 440,
        "createdAt": "2025-06-10T12:57:48.244Z",
    },
    {
        "_id": "68482bb598eb9722b7751f60",
        "instrument": dummyInstrumentData[1],
        "user": "6847f7cab3d8daecdb517095",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "pickupDate": "2025-06-12T00:00:00.000Z",
        "returnDate": "2025-06-12T00:00:00.000Z",
        "status": "pending",
        "price": 130,
        "createdAt": "2025-06-10T12:57:25.613Z",
    },
    {
        "_id": "684800fa0fb481c5cfd92e56",
        "instrument": dummyInstrumentData[2],
        "user": "6847f7cab3d8daecdb517095",
        "owner": "67fe3467ed8a8fe17d0ba6e2",
        "pickupDate": "2025-06-11T00:00:00.000Z",
        "returnDate": "2025-06-12T00:00:00.000Z",
        "status": "pending",
        "price": 600,
        "createdAt": "2025-06-10T09:55:06.379Z",
    },
    {
        "_id": "6847fe790fb481c5cfd92d94",
        "instrument": dummyInstrumentData[3],
        "user": "6847f7cab3d8daecdb517095",
        "owner": "6847f7cab3d8daecdb517095",
        "pickupDate": "2025-06-11T00:00:00.000Z",
        "returnDate": "2025-06-12T00:00:00.000Z",
        "status": "confirmed",
        "price": 440,
        "createdAt": "2025-06-10T09:44:25.410Z",
    }
]

export const dummyDashboardData = {
    "totalInstruments": 4,
    "totalBookings": 2,
    "pendingBookings": 0,
    "completedBookings": 2,
    "recentBookings": [
        dummyMyBookingsData[0],
        dummyMyBookingsData[1]
    ],
    "monthlyRevenue": 840
}

export const dummyUserData = {
  "_id": "6847f7cab3d8daecdb517095",
  "name": "Dinitha",
  "email": "admin@example.com",
  "role": "owner",
  "image": user_profile,
}


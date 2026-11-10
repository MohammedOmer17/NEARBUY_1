/**
 * NearBuy Kirana Shops Seed Data - Murad Nagar & Surrounding Areas, Hyderabad
 *
 * Locality distribution:
 * - Murad Nagar (Hub)
 * - Zeba Bagh
 * - Dattadari Colony (Dattatreya Colony)
 * - Syed Ali Guda
 * - Asif Nagar
 * - Alapathi Nagar
 * - Viswash Nagar
 *
 * All coordinates are within ~1.5 km of Murad Nagar center (17.3822° N, 78.4421° E),
 * making them ideal for realistic distance calculations, route lookups, and customer assessments.
 */

const DEMO_OWNER_PASSWORD = process.env.SEED_DEMO_OWNER_PASSWORD || "NearBuy@Demo2025!";

const KIRANA_SHOPS = [
  {
    code: "murad01",
    owner: {
      email: "murad.owner01@nearbuy.test",
      name: "Demo Owner 01 (Azhar Kirana)",
      phone: "+919848010001",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "AZHAR KIRANA AND GENERAL STORE (Demo)",
      address: "12-2-417/A/18, Near Choti Masjid, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Murad Nagar",
      location: {
        latitude: 17.3824,
        longitude: 78.4418,
      },
      contact: "040-23510001",
      locationType: "Verified micro-locality pin (Choti Masjid, Murad Nagar)",
      isApproximate: false,
      paymentDetails: {
        upiId: "azhar.kirana.demo@okhdfcbank",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=azhar.kirana.demo@okhdfcbank&pn=Azhar+Kirana",
      },
      status: "active",
      priceVariationRate: 0.0, // Benchmark base price
      stockMultiplier: 1.0,
    },
  },
  {
    code: "murad02",
    owner: {
      email: "murad.owner02@nearbuy.test",
      name: "Demo Owner 02 (Zakir Kirana)",
      phone: "+919848010002",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Zakir Kirana And General Store (Demo)",
      address: "12-1-508/87, Murad Nagar Main Road, Asif Nagar, Hyderabad, Telangana 500028",
      locality: "Murad Nagar / Asif Nagar",
      location: {
        latitude: 17.3831,
        longitude: 78.4435,
      },
      contact: "040-23510002",
      locationType: "Verified micro-locality pin (Murad Nagar Main Road)",
      isApproximate: false,
      paymentDetails: {
        upiId: "zakir.kirana.demo@oksbi",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=zakir.kirana.demo@oksbi&pn=Zakir+Kirana",
      },
      status: "active",
      priceVariationRate: 0.02, // +2% premium convenience
      stockMultiplier: 1.0,
    },
  },
  {
    code: "murad03",
    owner: {
      email: "murad.owner03@nearbuy.test",
      name: "Demo Owner 03 (ASF Mart)",
      phone: "+919848010003",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "ASF Mart (Demo)",
      address: "12-2-419/A/1, Opp. Choti Masjid, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Murad Nagar",
      location: {
        latitude: 17.3828,
        longitude: 78.4412,
      },
      contact: "040-23510003",
      locationType: "Verified micro-locality pin (Opp. Choti Masjid)",
      isApproximate: false,
      paymentDetails: {
        upiId: "asf.mart.demo@okaxis",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=asf.mart.demo@okaxis&pn=ASF+Mart",
      },
      status: "active",
      priceVariationRate: -0.03, // -3% competitive supermarket pricing
      stockMultiplier: 1.8, // Larger supermarket inventory
    },
  },
  {
    code: "murad04",
    owner: {
      email: "murad.owner04@nearbuy.test",
      name: "Demo Owner 04 (Al-Kareem Kirana)",
      phone: "+919848010004",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Al-Kareem Kirana (Demo)",
      address: "12-1-496/24, Near Murad Nagar Kaman, Syed Ali Guda, Hyderabad, Telangana 500028",
      locality: "Syed Ali Guda",
      location: {
        latitude: 17.3842,
        longitude: 78.4468,
      },
      contact: "040-23510004",
      locationType: "Verified micro-locality pin (Murad Nagar Kaman / Syed Ali Guda)",
      isApproximate: false,
      paymentDetails: {
        upiId: "alkareem.kirana.demo@icici",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=alkareem.kirana.demo@icici&pn=Al+Kareem+Kirana",
      },
      status: "active",
      priceVariationRate: 0.01, // +1%
      stockMultiplier: 1.0,
    },
  },
  {
    code: "murad05",
    owner: {
      email: "murad.owner05@nearbuy.test",
      name: "Demo Owner 05 (Bismillah Kirana)",
      phone: "+919848010005",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Bismillah Kirana & General Stores (Demo)",
      address: "12-1-331/A, Near Sri Raghavendra Swamy Function Hall, Zeba Bagh, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Zeba Bagh",
      location: {
        latitude: 17.3868,
        longitude: 78.4408,
      },
      contact: "040-23510005",
      locationType: "Verified micro-locality pin (Zeba Bagh / Function Hall)",
      isApproximate: false,
      paymentDetails: {
        upiId: "bismillah.kirana.demo@paytm",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=bismillah.kirana.demo@paytm&pn=Bismillah+Kirana",
      },
      status: "active",
      priceVariationRate: -0.01, // -1%
      stockMultiplier: 1.1,
    },
  },
  {
    code: "murad06",
    owner: {
      email: "murad.owner06@nearbuy.test",
      name: "Demo Owner 06 (Murad Kirana)",
      phone: "+919848010006",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Murad Kirana & General Store (Demo)",
      address: "12-2-338/B, Gudimalkapur Road, Dattadari Colony, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Dattadari Colony",
      location: {
        latitude: 17.3808,
        longitude: 78.4452,
      },
      contact: "040-23510006",
      locationType: "Verified micro-locality pin (Dattadari Colony / Gudimalkapur Road)",
      isApproximate: false,
      paymentDetails: {
        upiId: "murad.kirana.demo@okhdfcbank",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=murad.kirana.demo@okhdfcbank&pn=Murad+Kirana",
      },
      status: "active",
      priceVariationRate: 0.02, // +2%
      stockMultiplier: 1.0,
    },
  },
  {
    code: "murad07",
    owner: {
      email: "murad.owner07@nearbuy.test",
      name: "Demo Owner 07 (Habeeb Brothers)",
      phone: "+919848010007",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Habeeb & Brothers Kirana & General Store (Demo)",
      address: "12-1-840/12, Main Road, Alapathi Nagar, Asif Nagar, Hyderabad, Telangana 500028",
      locality: "Alapathi Nagar",
      location: {
        latitude: 17.3852,
        longitude: 78.4382,
      },
      contact: "040-23510007",
      locationType: "Approximate locality pin (Alapathi Nagar commercial corridor)",
      isApproximate: true,
      paymentDetails: {
        upiId: "habeeb.brothers.demo@oksbi",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=habeeb.brothers.demo@oksbi&pn=Habeeb+Brothers",
      },
      status: "active",
      priceVariationRate: 0.03, // +3%
      stockMultiplier: 0.9,
    },
  },
  {
    code: "murad08",
    owner: {
      email: "murad.owner08@nearbuy.test",
      name: "Demo Owner 08 (Hussain Traders)",
      phone: "+919848010008",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Hussain Traders General Kirana Stores (Demo)",
      address: "12-2-718/3, Asif Nagar Road, Near Jhirra, Asif Nagar, Hyderabad, Telangana 500028",
      locality: "Asif Nagar",
      location: {
        latitude: 17.3885,
        longitude: 78.451,
      },
      contact: "040-23510008",
      locationType: "Verified micro-locality pin (Asif Nagar Main Road / Jhirra)",
      isApproximate: false,
      paymentDetails: {
        upiId: "hussain.traders.demo@okaxis",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hussain.traders.demo@okaxis&pn=Hussain+Traders",
      },
      status: "active",
      priceVariationRate: -0.02, // -2% wholesale discount
      stockMultiplier: 1.5,
    },
  },
  {
    code: "murad09",
    owner: {
      email: "murad.owner09@nearbuy.test",
      name: "Demo Owner 09 (New National)",
      phone: "+919848010009",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "New National Kirana General Store (Demo)",
      address: "12-1-380/B, Zeba Bagh Lane 3, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Zeba Bagh",
      location: {
        latitude: 17.3875,
        longitude: 78.4422,
      },
      contact: "040-23510009",
      locationType: "Verified micro-locality pin (Zeba Bagh Lane 3)",
      isApproximate: false,
      paymentDetails: {
        upiId: "newnational.kirana.demo@icici",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=newnational.kirana.demo@icici&pn=New+National+Kirana",
      },
      status: "active",
      priceVariationRate: 0.04, // +4%
      stockMultiplier: 0.9,
    },
  },
  {
    code: "murad10",
    owner: {
      email: "murad.owner10@nearbuy.test",
      name: "Demo Owner 10 (Maaz General)",
      phone: "+919848010010",
      password: DEMO_OWNER_PASSWORD,
    },
    shop: {
      shopName: "Maaz General And Kirana Store (Demo)",
      address: "12-2-512/C, Viswash Nagar Colony, Murad Nagar, Hyderabad, Telangana 500028",
      locality: "Viswash Nagar",
      location: {
        latitude: 17.3812,
        longitude: 78.4392,
      },
      contact: "040-23510010",
      locationType: "Approximate locality pin (Viswash Nagar Colony)",
      isApproximate: true,
      paymentDetails: {
        upiId: "maaz.general.demo@paytm",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=maaz.general.demo@paytm&pn=Maaz+General",
      },
      status: "active",
      priceVariationRate: -0.01, // -1%
      stockMultiplier: 1.0,
    },
  },
];

module.exports = {
  KIRANA_SHOPS,
  DEMO_OWNER_PASSWORD,
};

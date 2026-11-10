# NearBuy Development Seed Data — Murad Nagar Kirana Stores

This directory provides a safe, idempotent development seeding system for NearBuy's backend. It seeds realistic kirana stores and owner accounts located in and around **Murad Nagar, Asif Nagar, Hyderabad, Telangana, India**, with cross-shop product listings for price comparison testing.

## Overview

- **Shops Seeded:** 10 independent kirana stores / marts across Murad Nagar, Zeba Bagh, Dattadari Colony, Syed Ali Guda, Asif Nagar, Alapathi Nagar, and Viswash Nagar.
- **Owner Accounts:** 10 synthetic demo shop-owner accounts (`murad.owner01@nearbuy.test` through `murad.owner10@nearbuy.test`).
- **Product Catalogue:** 118 distinct canonical FMCG and grocery items across 12 categories.
- **Cross-Shop Comparisons:** 65 staple products listed in 8 to 10 shops with realistic INR price variations (1% to 5%) for multi-shop price comparison.
- **Overall Listings:** ~840 shop-specific `ShopProduct` records.
- **Safety:** Defaults to idempotent upsert; only operates in non-production environments; never touches real customer or manual development records.

---

## Authentication & Credentials

All seeded accounts are synthetic local development test accounts:

| Shop Name | Owner Name | Login Email | Demo Password | Status |
| :--- | :--- | :--- | :--- | :--- |
| AZHAR KIRANA AND GENERAL STORE (Demo) | Demo Owner 01 (Azhar Kirana) | `murad.owner01@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Zakir Kirana And General Store (Demo) | Demo Owner 02 (Zakir Kirana) | `murad.owner02@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| ASF Mart (Demo) | Demo Owner 03 (ASF Mart) | `murad.owner03@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Al-Kareem Kirana (Demo) | Demo Owner 04 (Al-Kareem Kirana) | `murad.owner04@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Bismillah Kirana & General Stores (Demo) | Demo Owner 05 (Bismillah Kirana) | `murad.owner05@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Murad Kirana & General Store (Demo) | Demo Owner 06 (Murad Kirana) | `murad.owner06@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Habeeb & Brothers Kirana & General Store (Demo) | Demo Owner 07 (Habeeb Brothers) | `murad.owner07@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Hussain Traders General Kirana Stores (Demo) | Demo Owner 08 (Hussain Traders) | `murad.owner08@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| New National Kirana General Store (Demo) | Demo Owner 09 (New National) | `murad.owner09@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |
| Maaz General And Kirana Store (Demo) | Demo Owner 10 (Maaz General) | `murad.owner10@nearbuy.test` | `NearBuy@Demo2025!` | `approved` / `active` |

Passwords are encrypted using `bcrypt` (12 rounds) and are fully compatible with `ShopOwnerModel.comparePassword()` and `/shop-owner/login`.

---

## Seeded Stores & Geographic Locations

All shops are located within ~1.5 km of Murad Nagar center (17.3822° N, 78.4421° E):

| # | Shop Name | Locality | Latitude | Longitude | Derivation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | AZHAR KIRANA AND GENERAL STORE (Demo) | Murad Nagar | `17.3824` | `78.4418` | Verified micro-locality pin (Choti Masjid) |
| 2 | Zakir Kirana And General Store (Demo) | Murad Nagar / Asif Nagar | `17.3831` | `78.4435` | Verified micro-locality pin (Murad Nagar Main Rd) |
| 3 | ASF Mart (Demo) | Murad Nagar | `17.3828` | `78.4412` | Verified micro-locality pin (Opp. Choti Masjid) |
| 4 | Al-Kareem Kirana (Demo) | Syed Ali Guda | `17.3842` | `78.4468` | Verified micro-locality pin (Murad Nagar Kaman) |
| 5 | Bismillah Kirana & General Stores (Demo) | Zeba Bagh | `17.3868` | `78.4408` | Verified micro-locality pin (Function Hall) |
| 6 | Murad Kirana & General Store (Demo) | Dattadari Colony | `17.3808` | `78.4452` | Verified micro-locality pin (Gudimalkapur Rd) |
| 7 | Habeeb & Brothers Kirana & General Store (Demo) | Alapathi Nagar | `17.3852` | `78.4382` | Approximate locality pin (Commercial belt) |
| 8 | Hussain Traders General Kirana Stores (Demo) | Asif Nagar | `17.3885` | `78.4510` | Verified micro-locality pin (Jhirra / Main Rd) |
| 9 | New National Kirana General Store (Demo) | Zeba Bagh | `17.3875` | `78.4422` | Verified micro-locality pin (Zeba Bagh Lane 3) |
| 10 | Maaz General And Kirana Store (Demo) | Viswash Nagar | `17.3812` | `78.4392` | Approximate locality pin (Viswash Nagar Colony) |

*Disclaimer: The seeded shop names, addresses, catalogues, and prices are synthetic development data created strictly for local testing and feature evaluation. They do not claim to represent verified real-time prices or private information from real merchants.*

---

## Product Categories (118 Canonical Items)

1. `Rice, Grains & Cereals` (Basmati rice, Sona Masoori, Idli rice, Organic brown rice, Poha)
2. `Atta, Flours & Staples` (Chakki atta, Sharbati atta, Besan, Maida, Sooji Rava, Multigrain atta)
3. `Dals & Pulses` (Toor dal, Moong dal, Chana dal, Urad dal, Masoor dal, Whole moong, Kabuli chana, Rajma)
4. `Edible Oils & Ghee` (Sunflower oil, Mustard oil, Rice bran oil, Coconut oil, Pure desi ghee)
5. `Spices & Masalas` (Turmeric, Chilli, Coriander, Jeera, Garam masala, Biryani masala, Chicken masala, Ginger garlic paste)
6. `Dairy & Eggs` (Toned milk, Full cream milk, Fresh dahi/curd, Paneer, Butter, Cheese slices, Table eggs)
7. `Sugar, Salt & Sweeteners` (Sulphurless sugar, Iodized salt, Low sodium salt, Himalayan pink salt, Jaggery, Honey)
8. `Snacks & Biscuits` (Parle-G, Marie Gold, Good Day, Dark Fantasy, Oreo, Lay's, Kurkure, Aloo Bhujia)
9. `Beverages & Tea/Coffee` (Red Label, Tata Tea Gold, Nescafe, Bru, Bournvita, Horlicks, Bottled water, Thums Up)
10. `Breakfast & Packaged Food` (Corn flakes, Rolled oats, Roasted vermicelli, Instant upma, Maggi noodles, Ketchup, Jam)
11. `Personal Care` (Dettol soap, Dove, Santoor, Head & Shoulders, Colgate, Closeup, Toothbrush, Liquid handwash)
12. `Household & Cleaning` (Surf Excel, Ariel, Rin bar, Vim bar & gel, Lizol floor cleaner, Harpic, Scrub pads, Mosquito repellent)

All units strictly adhere to the Mongoose enum `["kg", "g", "ltr", "ml", "packet", "piece"]`.

---

## How to Run

From the `Backend/` directory:

### Safe Idempotent Upsert (Default)
Updates existing seed records and inserts any missing records without creating duplicates:
```bash
npm run seed:kirana
```

### Opt-In Reset & Re-Seed
Removes only previous seed records (`murad.owner*@nearbuy.test` and their shops/products) before re-seeding:
```bash
npm run seed:kirana:reset
```

### Configuration
The script checks for:
- `SEED_TEST_DATA_MONGODB_URI` or `MONGODB_URI` in `.env` or system environment.
- Rejects execution if `NODE_ENV === 'production'`.

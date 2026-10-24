
// STARTER DATA ONLY. The store reads products from Firestore (products/{id}).
// This list is used by Admin > Product Management > "Add starter products"
// to fill an empty Firestore. Edit products in the admin panel, not here.
export const PRODUCTS = [
  { id: 'nike-aj1', brand: 'NIKE',size: ["7","8","9","10"], code: 'NKE', name: 'Air Jordan (AJ1)', priceValue: 3499, image: '/items/Airjordan 1.jpeg' },
  { id: 'nike-melo', brand: 'NIKE', size: ["7","8","9","10"], code: 'NKE', name: 'Air Jordan MELO', priceValue: 3799, image: '/items/airmelo.webp' },
  { id: 'nike-lastdance', brand: 'NIKE', size: ["7","8","9","10"], code: 'NKE', name: 'Jordan Last Dance', priceValue: 3999, image: '/items/Jordan_last dance.webp' },
  { id: 'adidas-bahrain', brand: 'ADIDAS', size: ["7","8","9","10"],code: 'ADS', name: 'Adidas Bahrain', priceValue: 3299, image: '/items/Bahrain.avif' },
  { id: 'adidas-samba', brand: 'ADIDAS',size: ["7","8","9","10"], code: 'ADS', name: 'Samba', priceValue: 3599, image: '/items/samba.avif' },
  { id: 'adidas-ultrarun', brand: 'ADIDAS',size: ["7","8","9","10"], code: 'ADS', name: 'Ultra Run', priceValue: 3899, image: '/items/Ultrarun.avif' },
  { id: 'puma-speedcat', brand: 'PUMA',size: ["7","8","9","10"],code: 'PMA', name: 'Speed Cat OG', priceValue: 3199, image: '/items/speed cat og.avif' },
  { id: 'puma-carnival', brand: 'PUMA',size: ["7","8","9","10"], code: 'PMA', name: 'Carnival', priceValue: 3499, image: '/items/Carnival.avif' },
  { id: 'puma-vintage', brand: 'PUMA', size: ["7","8","9","10"], code: 'PMA', name: 'Vintage Puma', priceValue: 3699, image: '/items/Vintage.webp' },
 
 


]

export function money(amount) {
  return `₱${amount.toLocaleString('en-PH')}`
}

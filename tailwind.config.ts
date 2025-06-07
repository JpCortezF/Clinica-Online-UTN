module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
    './node_modules/flowbite/**/*.js'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')
  ],
}
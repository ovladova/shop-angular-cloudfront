export async function getProductsList() {
  return {
    body: JSON.stringify({ message: 'Hello from Lambda 🎉' }),
    statusCode: 200,
  };
}

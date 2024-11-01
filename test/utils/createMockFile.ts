export default function createMockFile({
  name = "file.txt",
  size = 1024,
  type = "plain/txt",
}) {
  const blob = new Blob(["a".repeat(size)]);

  const file = new File([blob], name, { type });

  return file;
}
